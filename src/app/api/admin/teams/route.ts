import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const { response } = await requireRole(["ADMIN"]);
  if (response) return response;

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { department: true, users: true },
  });
  return NextResponse.json({ teams });
}

const createSchema = z.object({ name: z.string().min(1).max(100), departmentId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { response } = await requireRole(["ADMIN"]);
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 });

  const team = await prisma.team.create({ data: parsed.data });
  return NextResponse.json({ team }, { status: 201 });
}
