import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/api-key";
import { emailLocalPart } from "@/lib/identity";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function GET() {
  const { response } = await requireRole(["ADMIN"]);
  if (response) return response;

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
      departmentId: true,
      createdAt: true,
      team: { select: { name: true } },
      department: { select: { name: true } },
    },
  });
  return NextResponse.json({ users });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "DEPARTMENT_HEAD", "TEAM_LEAD", "MEMBER"]),
  departmentId: z.string().nullable().optional(),
  teamId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const { response } = await requireRole(["ADMIN"]);
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 });

  const { password, departmentId, teamId, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      ...rest,
      emailLocalPart: emailLocalPart(rest.email),
      departmentId: departmentId ?? null,
      teamId: teamId ?? null,
      passwordHash,
      apiKey: generateApiKey(),
    },
  });

  return NextResponse.json({ user: { ...user, passwordHash: undefined } }, { status: 201 });
}
