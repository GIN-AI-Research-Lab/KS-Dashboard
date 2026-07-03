import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  outcome: z.enum(["SOLVED", "IN_PROGRESS", "ABANDONED"]).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  tags: z.string().max(300).nullable().optional(),
  featured: z.boolean().optional(),
});

// Annotate a session (outcome / note / tags / featured). Allowed for the
// session's own user or an ADMIN.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const { id } = await params;

  const target = await prisma.claudeSession.findUnique({ where: { id }, select: { userId: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = target.userId === session!.user.id;
  const isAdmin = session!.user.role === "ADMIN";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 });

  const d = parsed.data;
  const updated = await prisma.claudeSession.update({
    where: { id },
    data: {
      ...("outcome" in d ? { outcome: d.outcome ?? null } : {}),
      ...("note" in d ? { note: d.note?.trim() || null } : {}),
      ...("tags" in d ? { tags: d.tags?.trim() || null } : {}),
      ...("featured" in d ? { featured: d.featured } : {}),
      annotatedAt: new Date(),
    },
    select: { id: true, outcome: true, note: true, tags: true, featured: true, annotatedAt: true },
  });
  return NextResponse.json({ session: updated });
}
