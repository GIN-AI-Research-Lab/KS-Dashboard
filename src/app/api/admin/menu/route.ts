import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { invalidateMenuSettings } from "@/lib/menu-config";
import { MENU_BY_KEY, type MenuKey } from "@/lib/menu";

const bodySchema = z.object({
  items: z.array(
    z.object({
      key: z.string(),
      visible: z.boolean(),
      sortOrder: z.number().int(),
    }),
  ),
});

function isMenuKey(key: string): key is MenuKey {
  return key in MENU_BY_KEY;
}

// Save the global sidebar configuration (visibility + order). Admin only.
export async function POST(req: Request) {
  const { response } = await requireRole(["ADMIN"]);
  if (response) return response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  }

  // Ignore unknown keys so a stale client can't create junk rows.
  const items = parsed.data.items.filter((it) => isMenuKey(it.key));

  await prisma.$transaction(
    items.map((it) =>
      prisma.menuSetting.upsert({
        where: { key: it.key },
        create: { key: it.key, visible: it.visible, sortOrder: it.sortOrder },
        update: { visible: it.visible, sortOrder: it.sortOrder },
      }),
    ),
  );

  invalidateMenuSettings();
  return NextResponse.json({ ok: true, count: items.length });
}

// Reset to code defaults by clearing all overrides. Admin only.
export async function DELETE() {
  const { response } = await requireRole(["ADMIN"]);
  if (response) return response;

  await prisma.menuSetting.deleteMany({});
  invalidateMenuSettings();
  return NextResponse.json({ ok: true });
}
