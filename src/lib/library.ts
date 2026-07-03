import type { LibraryItemKind } from "@prisma/client";

export const KIND_LABEL: Record<LibraryItemKind, string> = {
  PROMPT: "Prompt",
  SKILL: "Skill",
};

export const KIND_VARIANT: Record<LibraryItemKind, "info" | "good"> = {
  PROMPT: "info",
  SKILL: "good",
};

// Small fixed set of reactions offered in the UI.
export const REACTIONS = ["👍", "❤️", "🎉", "🚀", "👀"];

export const SORTS = [
  { key: "new", label: "Mới nhất" },
  { key: "comments", label: "Nhiều bình luận" },
  { key: "reactions", label: "Nhiều react" },
  { key: "stars", label: "Nhiều lưu" },
] as const;

export type LibrarySort = (typeof SORTS)[number]["key"];

export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}
