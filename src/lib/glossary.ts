import type { Translate } from "@/i18n/lookup";

// Metric tooltip text, reused by StatCards, table headers and chart titles via <InfoTip>.
export function getMetricHelp(t: Translate): Record<string, string> {
  return {
    totalTokens: t("glossary.totalTokens"),
    inputTokens: t("glossary.inputTokens"),
    outputTokens: t("glossary.outputTokens"),
    turns: t("glossary.turns"),
    cacheHitRatio: t("glossary.cacheHitRatio"),
    cacheReadTokens: t("glossary.cacheReadTokens"),
    cacheCreationTokens: t("glossary.cacheCreationTokens"),
    cost: t("glossary.cost"),
    costPerUser: t("glossary.costPerUser"),
    roi: t("glossary.roi"),
    sessionCount: t("glossary.sessionCount"),
    activeSessions: t("glossary.activeSessions"),
    activeUsers: t("glossary.activeUsers"),
    coverage: t("glossary.coverage"),
    tokensPerMember: t("glossary.tokensPerMember"),
    linesAdded: t("glossary.linesAdded"),
    linesRemoved: t("glossary.linesRemoved"),
    acceptanceRate: t("glossary.acceptanceRate"),
    otel: t("glossary.otel"),
    model: t("glossary.model"),
  };
}

// Grouped, display-friendly version for the standalone glossary page. Reuses the
// metric help text where possible so tooltips and the glossary stay in sync.
export function getGlossaryGroups(t: Translate): { group: string; items: { term: string; desc: string }[] }[] {
  const m = getMetricHelp(t);
  return [
    {
      group: t("glossary.groupTokenCost"),
      items: [
        { term: t("glossary.termToken"), desc: t("glossary.termTokenDesc") },
        { term: t("glossary.termInputToken"), desc: m.inputTokens },
        { term: t("glossary.termOutputToken"), desc: m.outputTokens },
        { term: t("glossary.termCostEstimate"), desc: m.cost },
        { term: t("glossary.termRoi"), desc: m.roi },
      ],
    },
    {
      group: t("glossary.groupCache"),
      items: [
        { term: t("glossary.termCacheHitRatio"), desc: m.cacheHitRatio },
        { term: t("glossary.termCacheReadTokens"), desc: m.cacheReadTokens },
        { term: t("glossary.termCacheCreateTokens"), desc: m.cacheCreationTokens },
      ],
    },
    {
      group: t("glossary.groupSession"),
      items: [
        { term: t("glossary.termSession"), desc: t("glossary.termSessionDesc") },
        { term: t("glossary.termTurn"), desc: m.turns },
        { term: t("glossary.termActiveUsers"), desc: m.activeUsers },
        { term: t("glossary.termDauWauMau"), desc: t("glossary.termDauWauMauDesc") },
        { term: t("glossary.termStickiness"), desc: t("glossary.termStickinessDesc") },
      ],
    },
    {
      group: t("glossary.groupOrg"),
      items: [
        { term: t("glossary.termCoverage"), desc: m.coverage },
        { term: t("glossary.termTokensPerMember"), desc: m.tokensPerMember },
        { term: t("glossary.termCohort"), desc: t("glossary.termCohortDesc") },
      ],
    },
    {
      group: t("glossary.groupCodeModel"),
      items: [
        { term: t("glossary.termLinesAddedRemoved"), desc: m.linesAdded },
        { term: t("glossary.termAcceptanceRate"), desc: m.acceptanceRate },
        { term: t("glossary.termOtel"), desc: m.otel },
        { term: t("glossary.termModelTier"), desc: t("glossary.termModelTierDesc") },
        { term: t("glossary.termPercentile"), desc: t("glossary.termPercentileDesc") },
      ],
    },
  ];
}
