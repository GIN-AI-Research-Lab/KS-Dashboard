import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["PROMPT", "SKILL"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  tags: z.string().max(300).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
});

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 });

  const item = await prisma.libraryItem.create({
    data: {
      kind: parsed.data.kind,
      title: parsed.data.title.trim(),
      body: parsed.data.body,
      tags: parsed.data.tags?.trim() || null,
      visibility: parsed.data.visibility,
      authorId: session!.user.id,
    },
  });
  return NextResponse.json({ item }, { status: 201 });
}
