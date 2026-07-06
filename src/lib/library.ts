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

// --- Skill name (Claude Code SKILL.md folder / invocation name) ---------------
// Lowercase kebab-case: letters, digits, single hyphens between segments.
export const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SKILL_NAME_MAX = 64;

export function isValidSkillName(name: string): boolean {
  return name.length > 0 && name.length <= SKILL_NAME_MAX && SKILL_NAME_RE.test(name);
}

/** Turn a free-text title into a valid, safe skill name (best-effort default). */
export function slugifySkillName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[đĐ]/g, "d") // đ has no combining-mark decomposition, handle first
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // strip accents (e.g. Vietnamese diacritics)
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .slice(0, SKILL_NAME_MAX)
    .replace(/-+$/g, ""); // avoid a trailing hyphen after the slice
}
