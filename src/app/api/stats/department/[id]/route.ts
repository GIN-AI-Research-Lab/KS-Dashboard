import { NextRequest, NextResponse } from "next/server";
import { requireSession, parseRange } from "@/lib/api-helpers";
import { getDepartmentStats } from "@/lib/stats";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireSession();
  if (response) return response;

  const { id } = await params;
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      teams: { include: { users: { select: { id: true, name: true } } } },
      users: { where: { teamId: null }, select: { id: true, name: true, role: true } },
    },
  });
  if (!department) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = await getDepartmentStats(id, parseRange(req));
  return NextResponse.json({ department, ...stats });
}
