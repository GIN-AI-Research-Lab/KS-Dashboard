import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await params;

  const item = await prisma.libraryItem.findUnique({ where: { id }, select: { id: true } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 });

  const comment = await prisma.libraryComment.create({
    data: { itemId: id, authorId: session!.user.id, body: parsed.data.body.trim() },
    include: { author: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ comment });
}
