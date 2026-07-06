import type { SessionOutcome } from "@prisma/client";
import type { Translate } from "@/i18n/lookup";

export function getOutcomeLabel(t: Translate): Record<SessionOutcome, string> {
  return {
    SOLVED: t("sessionsPage.outcomeSolved"),
    IN_PROGRESS: t("sessionsPage.outcomeInProgress"),
    ABANDONED: t("sessionsPage.outcomeAbandoned"),
  };
}

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
