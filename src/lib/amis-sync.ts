import { prisma } from "@/lib/db";
import { fetchAmisEmployees, type AmisEmployee } from "@/lib/amis";
import { emailLocalPart } from "@/lib/identity";
import { generateApiKey } from "@/lib/api-key";

const ACTIVE_STATUS_ID = 1; // "Đang làm việc" -- see AmisEmployee.EmployeeStatusID

export interface AmisSyncSummary {
  totalFromAmis: number;
  created: number;
  updated: number;
  skippedNoEmail: number;
  skippedInactive: number;
  failed: { employeeCode: string; error: string }[];
}

function resolveEmail(employee: AmisEmployee): string | null {
  return employee.Email?.trim() || employee.OfficeEmail?.trim() || null;
}

/** Pulls every employee from AMIS and upserts Department + User rows.
 * amisEmployeeCode is the primary match key on repeat syncs, but the first
 * sync for an employee may find an account that already exists (created by
 * an admin, or matched once via SSO) -- those are linked by emailLocalPart
 * instead of being duplicated. AMIS's employee API exposes only
 * OrganizationUnitName, which maps 1-1 onto Department. */
export async function runAmisSync(): Promise<AmisSyncSummary> {
  const clientId = process.env.AMIS_CLIENT_ID;
  const secretKey = process.env.AMIS_SECRET_KEY;
  if (!clientId || !secretKey) {
    throw new Error("AMIS_CLIENT_ID / AMIS_SECRET_KEY are not configured");
  }

  const employees = await fetchAmisEmployees(clientId, secretKey);
  const summary: AmisSyncSummary = {
    totalFromAmis: employees.length,
    created: 0,
    updated: 0,
    skippedNoEmail: 0,
    skippedInactive: 0,
    failed: [],
  };

  for (const employee of employees) {
    if (employee.EmployeeStatusID !== ACTIVE_STATUS_ID) {
      summary.skippedInactive += 1;
      continue;
    }

    const email = resolveEmail(employee);
    if (!email) {
      summary.skippedNoEmail += 1;
      continue;
    }

    try {
      const localPart = emailLocalPart(email);

      let departmentId: string | null = null;
      const orgUnitName = employee.OrganizationUnitName?.trim();
      if (orgUnitName) {
        const department = await prisma.department.upsert({
          where: { name: orgUnitName },
          create: { name: orgUnitName },
          update: {},
        });
        departmentId = department.id;
      }

      const existing = await prisma.user.findFirst({
        where: { OR: [{ amisEmployeeCode: employee.EmployeeCode }, { emailLocalPart: localPart }] },
      });

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: employee.FullName,
            email,
            emailLocalPart: localPart,
            departmentId,
            amisEmployeeCode: employee.EmployeeCode,
            lastAmisSyncAt: new Date(),
          },
        });
        summary.updated += 1;
      } else {
        await prisma.user.create({
          data: {
            name: employee.FullName,
            email,
            emailLocalPart: localPart,
            departmentId,
            amisEmployeeCode: employee.EmployeeCode,
            lastAmisSyncAt: new Date(),
            role: "MEMBER",
            apiKey: generateApiKey(),
          },
        });
        summary.created += 1;
      }
    } catch (err) {
      summary.failed.push({
        employeeCode: employee.EmployeeCode,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return summary;
}
