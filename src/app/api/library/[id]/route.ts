import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(20000).optional(),
  tags: z.string().max(300).nullable().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await params;

  const item = await prisma.libraryItem.findUnique({ where: { id }, select: { authorId: true } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.authorId !== session!.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 });

  const data = { ...parsed.data };
  if ("tags" in data) data.tags = data.tags?.trim() || null;

  const updated = await prisma.libraryItem.update({ where: { id }, data });
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await params;

  const item = await prisma.libraryItem.findUnique({ where: { id }, select: { authorId: true } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isOwner = item.authorId === session!.user.id;
  const isAdmin = session!.user.role === "ADMIN";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.libraryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
