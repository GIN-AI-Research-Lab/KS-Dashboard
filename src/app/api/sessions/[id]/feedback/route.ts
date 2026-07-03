import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ value: z.union([z.literal(1), z.literal(-1), z.literal(0)]) });

// Set the current user's 👍/👎 on a session. value 0 removes the vote (toggle off).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await params;

  const exists = await prisma.claudeSession.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 });

  const userId = session!.user.id;
  const value = parsed.data.value;
  if (value === 0) {
    await prisma.sessionFeedback.deleteMany({ where: { sessionId: id, userId } });
  } else {
    await prisma.sessionFeedback.upsert({
      where: { sessionId_userId: { sessionId: id, userId } },
      create: { sessionId: id, userId, value },
      update: { value },
    });
  }

  const agg = await prisma.sessionFeedback.groupBy({ by: ["value"], where: { sessionId: id }, _count: true });
  const up = agg.find((a) => a.value === 1)?._count ?? 0;
  const down = agg.find((a) => a.value === -1)?._count ?? 0;
  return NextResponse.json({ up, down, myVote: value });
}
