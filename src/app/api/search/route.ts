import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ users: [], teams: [], departments: [], sessions: [] });

  const [users, teams, departments, sessions] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] },
      select: { id: true, name: true, email: true },
      take: 6,
    }),
    prisma.team.findMany({ where: { name: { contains: q, mode: "insensitive" } }, select: { id: true, name: true }, take: 5 }),
    prisma.department.findMany({ where: { name: { contains: q, mode: "insensitive" } }, select: { id: true, name: true }, take: 5 }),
    prisma.claudeSession.findMany({
      where: {
        OR: [
          { projectLabel: { contains: q, mode: "insensitive" } },
          { note: { contains: q, mode: "insensitive" } },
          { tags: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, projectLabel: true, note: true },
      orderBy: { lastEventAt: "desc" },
      take: 6,
    }),
  ]);

  return NextResponse.json({ users, teams, departments, sessions });
}
