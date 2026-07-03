import type { SessionOutcome } from "@prisma/client";

export const OUTCOME_LABEL: Record<SessionOutcome, string> = {
  SOLVED: "Đã xử lý xong",
  IN_PROGRESS: "Đang xử lý",
  ABANDONED: "Bỏ dở",
};

export const OUTCOME_VARIANT: Record<SessionOutcome, "good" | "info" | "neutral"> = {
  SOLVED: "good",
  IN_PROGRESS: "info",
  ABANDONED: "neutral",
};

export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
