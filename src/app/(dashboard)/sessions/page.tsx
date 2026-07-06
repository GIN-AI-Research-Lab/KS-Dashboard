import Link from "next/link";
import { getSessionLibrary } from "@/lib/stats";
import { Library } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge, Tag } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SessionFilters } from "@/components/SessionFilters";
import { getOutcomeLabel, OUTCOME_VARIANT, parseTags } from "@/lib/session-outcome";
import { formatUsd, formatRelativeTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import type { SessionOutcome } from "@prisma/client";

const VALID_OUTCOMES: SessionOutcome[] = ["SOLVED", "IN_PROGRESS", "ABANDONED"];

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string; featured?: string; q?: string }>;
}) {
  const { outcome, featured, q } = await searchParams;
  const validOutcome = VALID_OUTCOMES.includes((outcome ?? "") as SessionOutcome)
    ? (outcome as SessionOutcome)
    : undefined;

  const [rows, t] = await Promise.all([
    getSessionLibrary({
      outcome: validOutcome,
      featured: featured === "1",
      q: q || undefined,
    }),
    getT(),
  ]);
  const OUTCOME_LABEL = getOutcomeLabel(t);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("sessionsPage.badge")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight"><span className="gradient-text">{t("sessionsPage.title")}</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("sessionsPage.subtitle")}
          </p>
        </div>
      </div>

      <SessionFilters />

      <Card title={`${rows.length} ${t("sessionsPage.countSuffix")}`}>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Library className="h-6 w-6" />}
            title={t("sessionsPage.noResultsTitle")}
            hint={t("sessionsPage.noResultsHint")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-2 pr-4 font-medium">{t("sessionsPage.colProject")}</th>
                  <th className="py-2 pr-4 font-medium">{t("sessionsPage.colPerson")}</th>
                  <th className="py-2 pr-4 font-medium">{t("sessionsPage.colOutcome")}</th>
                  <th className="py-2 pr-4 font-medium">{t("sessionsPage.colTags")}</th>
                  <th className="py-2 pr-4 text-right font-medium">{t("table.cost")}</th>
                  <th className="py-2 text-right font-medium">{t("sessionsPage.colLastEvent")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--border)] last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="py-2 pr-4">
                      <Link href={`/sessions/${s.id}`} className="font-medium text-accent transition-colors hover:underline">
                        {s.featured ? "★ " : ""}
                        {s.projectLabel ?? t("sessionsPage.unknownProject")}
                      </Link>
                      {s.note && <div className="max-w-[280px] truncate text-xs text-[var(--text-muted)]">{s.note}</div>}
                    </td>
                    <td className="py-2 pr-4 text-[var(--text-secondary)]">{s.user.name}</td>
                    <td className="py-2 pr-4">
                      {s.outcome ? (
                        <Badge variant={OUTCOME_VARIANT[s.outcome]}>{OUTCOME_LABEL[s.outcome]}</Badge>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {parseTags(s.tags).slice(0, 3).map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatUsd(s.costUsd)}</td>
                    <td className="py-2 text-right text-xs text-[var(--text-muted)]">{formatRelativeTime(s.lastEventAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
