import { NextRequest, NextResponse } from "next/server";
import { requireSession, parseRange } from "@/lib/api-helpers";
import { getTeamStats } from "@/lib/stats";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireSession();
  if (response) return response;

  const { id } = await params;
  const team = await prisma.team.findUnique({
    where: { id },
    include: { department: true, users: { select: { id: true, name: true, role: true } } },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = await getTeamStats(id, parseRange(req));
  return NextResponse.json({ team, ...stats });
}
