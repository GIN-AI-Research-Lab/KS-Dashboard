import { randomUUID, createHmac } from "node:crypto";

// Client for AMIS Thông tin nhân sự's "get-data-employee" Open API. Contract
// taken directly from MISA's PDF (Tai-lieu-tich-hop-API..., v1, 2022-11-09) --
// see HANDOFF.md for the source link. Do not guess at fields/endpoints beyond
// what that document specifies.
const AMIS_ENDPOINT = "https://amisapp.misa.vn/APIS/HRMProfileOpenAPI/api/Open/get-data-employee";

// Only the fields KS Dashboard actually consumes -- the real response has
// ~90 more HR fields (see the PDF's section 5.4) we have no use for.
export interface AmisEmployee {
  EmployeeCode: string;
  FullName: string;
  Email: string | null;
  OfficeEmail: string | null;
  OrganizationUnitName: string | null;
  EmployeeStatusID: number; // 1 = "Đang làm việc" (active), 2 = "Đã nghỉ việc"
}

interface AmisApiResponse {
  Success: boolean;
  Code: number;
  SubCode: number;
  UserMessage: string | null;
  SystemMessage: string | null;
  Data: { DataEmployee: AmisEmployee[]; Total: number } | null;
  GetLastData: boolean;
}

function buildAuthHeaders(clientId: string, secretKey: string) {
  const transactionId = randomUUID();
  // x-token = HMACSHA256(secretKey, transactionId), base64-encoded -- exact
  // algorithm from the PDF's section 6.
  const token = createHmac("sha256", secretKey).update(transactionId).digest("base64");
  return {
    "Content-Type": "application/json",
    "x-clientid": clientId,
    "x-transactionid": transactionId,
    "x-token": token,
  };
}

/** Fetches every employee from AMIS. The documented contract says
 * `PageSize: -1` returns everyone in a single response, but this follows
 * `GetLastData` regardless so it stays correct if that ever changes. */
export async function fetchAmisEmployees(clientId: string, secretKey: string): Promise<AmisEmployee[]> {
  const employees: AmisEmployee[] = [];
  let pageIndex = 1;

  for (;;) {
    const res = await fetch(AMIS_ENDPOINT, {
      method: "POST",
      headers: buildAuthHeaders(clientId, secretKey),
      body: JSON.stringify({ PageSize: -1, PageIndex: pageIndex }),
    });
    if (!res.ok) throw new Error(`AMIS API HTTP ${res.status}`);

    const body = (await res.json()) as AmisApiResponse;
    if (!body.Success) {
      throw new Error(
        `AMIS API error: ${body.UserMessage ?? body.SystemMessage ?? `code ${body.Code}/${body.SubCode}`}`,
      );
    }

    const page = body.Data?.DataEmployee ?? [];
    employees.push(...page);
    if (body.GetLastData || page.length === 0) break;
    pageIndex += 1;
  }

  return employees;
}
