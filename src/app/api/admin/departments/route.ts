import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const { response } = await requireRole(["ADMIN"]);
  if (response) return response;

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { users: true },
  });
  return NextResponse.json({ departments });
}

const createSchema = z.object({ name: z.string().min(1).max(100) });

export async function POST(req: NextRequest) {
  const { response } = await requireRole(["ADMIN"]);
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 });

  const department = await prisma.department.create({ data: { name: parsed.data.name } });
  return NextResponse.json({ department }, { status: 201 });
}
