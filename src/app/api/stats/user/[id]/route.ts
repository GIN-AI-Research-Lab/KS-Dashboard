import { NextRequest, NextResponse } from "next/server";
import { requireSession, parseRange } from "@/lib/api-helpers";
import { getUserStats } from "@/lib/stats";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response, session } = await requireSession();
  if (response) return response;

  const { id } = await params;
  const userId = id === "me" ? session!.user.id : id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: { select: { id: true, name: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stats = await getUserStats(userId, parseRange(req));
  return NextResponse.json({ user, ...stats });
}
