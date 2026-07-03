import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ body: z.string().min(1).max(2000) });

// Add a comment to a session. Any authenticated user may comment (team discussion).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await params;

  const exists = await prisma.claudeSession.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 });

  const comment = await prisma.sessionComment.create({
    data: { sessionId: id, authorId: session!.user.id, body: parsed.data.body.trim() },
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ comment });
}
