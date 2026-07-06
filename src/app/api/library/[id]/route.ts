import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { isValidSkillName, SKILL_NAME_MAX } from "@/lib/library";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(20000).optional(),
  tags: z.string().max(300).nullable().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  skillName: z.string().max(SKILL_NAME_MAX).optional(),
  skillDescription: z.string().max(300).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await params;

  const item = await prisma.libraryItem.findUnique({ where: { id }, select: { authorId: true, kind: true } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.authorId !== session!.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  const d = parsed.data;

  const data: Prisma.LibraryItemUpdateInput = {};
  if (d.title !== undefined) data.title = d.title.trim();
  if (d.body !== undefined) data.body = d.body;
  if ("tags" in d) data.tags = d.tags?.trim() || null;
  if (d.visibility !== undefined) data.visibility = d.visibility;

  // Skill name/description are only valid on SKILL items and follow the same
  // rules as creation (kebab-case name, non-empty description).
  if (d.skillName !== undefined || d.skillDescription !== undefined) {
    if (item.kind !== "SKILL") {
      return NextResponse.json({ error: "Chỉ skill mới có tên/mô tả skill." }, { status: 422 });
    }
    if (d.skillName !== undefined) {
      const name = d.skillName.trim();
      if (!isValidSkillName(name)) {
        return NextResponse.json({ error: "Tên skill không hợp lệ — chỉ dùng a-z, 0-9 và dấu gạch nối (kebab-case)." }, { status: 422 });
      }
      data.skillName = name;
    }
    if (d.skillDescription !== undefined) {
      const desc = d.skillDescription?.trim() || "";
      if (!desc) return NextResponse.json({ error: "Skill cần có mô tả ngắn." }, { status: 422 });
      data.skillDescription = desc;
    }
  }

  try {
    const updated = await prisma.libraryItem.update({ where: { id }, data });
    return NextResponse.json({ item: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: `Tên skill "${d.skillName?.trim()}" đã tồn tại — hãy chọn tên khác.` }, { status: 409 });
    }
    throw e;
  }
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
