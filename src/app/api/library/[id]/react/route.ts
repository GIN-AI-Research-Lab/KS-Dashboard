import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { REACTIONS } from "@/lib/library";
import { z } from "zod";

const schema = z.object({ emoji: z.string() });

// Toggle one emoji reaction for the current user on an item.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success || !REACTIONS.includes(parsed.data.emoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 422 });
  }
  const emoji = parsed.data.emoji;
  const userId = session!.user.id;

  const item = await prisma.libraryItem.findUnique({ where: { id }, select: { id: true } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.libraryReaction.findUnique({
    where: { itemId_userId_emoji: { itemId: id, userId, emoji } },
  });
  if (existing) {
    await prisma.libraryReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.libraryReaction.create({ data: { itemId: id, userId, emoji } });
  }

  const all = await prisma.libraryReaction.findMany({ where: { itemId: id }, select: { userId: true, emoji: true } });
  const counts = new Map<string, number>();
  const mine: string[] = [];
  for (const r of all) {
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    if (r.userId === userId) mine.push(r.emoji);
  }
  return NextResponse.json({
    reactionCounts: Array.from(counts.entries()).map(([e, count]) => ({ emoji: e, count })),
    myReactions: mine,
  });
}
