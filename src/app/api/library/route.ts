import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { isValidSkillName, SKILL_NAME_MAX } from "@/lib/library";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["PROMPT", "SKILL"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  tags: z.string().max(300).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  // Only meaningful for kind=SKILL; validated conditionally below.
  skillName: z.string().max(SKILL_NAME_MAX).optional(),
  skillDescription: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 });

  const { kind, title, body, tags, visibility } = parsed.data;

  // A skill maps 1-1 onto a SKILL.md folder, so it must carry a valid kebab-case
  // name (the folder / `/name`) and a description (the frontmatter trigger).
  let skillName: string | null = null;
  let skillDescription: string | null = null;
  if (kind === "SKILL") {
    skillName = parsed.data.skillName?.trim() ?? "";
    skillDescription = parsed.data.skillDescription?.trim() ?? "";
    if (!isValidSkillName(skillName)) {
      return NextResponse.json({ error: "Tên skill không hợp lệ — chỉ dùng a-z, 0-9 và dấu gạch nối (kebab-case)." }, { status: 422 });
    }
    if (!skillDescription) {
      return NextResponse.json({ error: "Skill cần có mô tả ngắn (để Claude biết khi nào dùng)." }, { status: 422 });
    }
  }

  try {
    const item = await prisma.libraryItem.create({
      data: {
        kind,
        title: title.trim(),
        body,
        tags: tags?.trim() || null,
        visibility,
        skillName,
        skillDescription,
        authorId: session!.user.id,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: `Tên skill "${skillName}" đã tồn tại — hãy chọn tên khác.` }, { status: 409 });
    }
    throw e;
  }
}
