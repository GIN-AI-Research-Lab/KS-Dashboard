import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";

// Toggle the current user's star / bookmark on an item.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await params;
  const userId = session!.user.id;

  const item = await prisma.libraryItem.findUnique({ where: { id }, select: { id: true } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.libraryBookmark.findUnique({
    where: { itemId_userId: { itemId: id, userId } },
  });
  if (existing) {
    await prisma.libraryBookmark.delete({ where: { id: existing.id } });
  } else {
    await prisma.libraryBookmark.create({ data: { itemId: id, userId } });
  }

  const count = await prisma.libraryBookmark.count({ where: { itemId: id } });
  return NextResponse.json({ bookmarked: !existing, count });
}
