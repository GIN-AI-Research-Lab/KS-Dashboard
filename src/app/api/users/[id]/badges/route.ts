import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-helpers";
import { getUserGamification } from "@/lib/stats";

// Earned badges for a user, used by the name-hover tooltip (UserChip). Kept
// small: only the earned badges' icon + label.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireSession();
  if (response) return response;

  const { id } = await params;
  const gami = await getUserGamification(id);
  const badges = gami.badges
    .filter((b) => b.earned)
    .map((b) => ({ key: b.key, label: b.label, icon: b.icon }));

  return NextResponse.json({ badges, earnedCount: gami.earnedCount, totalCount: gami.totalCount });
}
