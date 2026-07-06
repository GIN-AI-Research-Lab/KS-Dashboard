import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionDetail } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { formatNumber, formatUsd, formatDuration, formatRelativeTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import { ArrowDownToLine, ArrowUpFromLine, DollarSign, Repeat, Clock, Check, X, MoreHorizontal } from "lucide-react";
import type { SessionStatus } from "@prisma/client";

// Live detail auto-updates via the dashboard's global AutoRefresh (~5s), so an
// active session's timeline reflects its current state without a dedicated feed.
export const dynamic = "force-dynamic";

type TimelineEvent =
  | { kind: "turn"; at: Date; model: string; inputTokens: number; outputTokens: number; costUsd: number; stopReason: string | null }
  | { kind: "tool"; at: Date; toolName: string; status: string; durationMs: number | null };

const STATUS_META: Record<SessionStatus, { variant: "good" | "warning" | "neutral"; key: string }> = {
  ACTIVE: { variant: "good", key: "live.running" },
  IDLE: { variant: "warning", key: "live.idle" },
  ENDED: { variant: "neutral", key: "live.ended" },
};

export default async function LiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, s] = await Promise.all([getT(), getSessionDetail(id)]);
  if (!s) notFound();

  const durationMs = (s.endedAt ?? s.lastEventAt).getTime() - s.startedAt.getTime();
  const meta = STATUS_META[s.status];

  const events: TimelineEvent[] = [
    ...s.turns.map((turn) => ({
      kind: "turn" as const,
      at: turn.createdAt,
      model: turn.model,
      inputTokens: turn.inputTokens,
      outputTokens: turn.outputTokens,
      costUsd: turn.costUsd,
      stopReason: turn.stopReason,
    })),
    ...s.toolCalls.map((tc) => ({
      kind: "tool" as const,
      at: tc.startedAt,
      toolName: tc.toolName,
      status: tc.status,
      durationMs: tc.durationMs,
    })),
  ]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 500);

  return (
    <div className="stagger flex flex-col gap-6">
      <Link href="/live" className="text-xs text-[var(--text-muted)] transition-colors hover:text-accent hover:underline">
        ← {t("live.back")}
      </Link>

      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("live.detailBadge")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            <span className="gradient-text">{s.projectLabel ?? "—"}</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            <Link href={`/users/${s.userId}`} className="transition-colors hover:text-accent hover:underline">
              {s.user.name}
            </Link>
            {s.model ? ` · ${s.model}` : ""}
            {s.user.department ? ` · ${s.user.department.name}` : ""}
            {` · ${formatRelativeTime(s.startedAt)}`}
          </p>
        </div>
        <Badge variant={meta.variant}>{t(meta.key)}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label={t("live.tokensIn")} value={formatNumber(s.inputTokens)} accent="#1baf7a" icon={<ArrowDownToLine className="h-4 w-4" />} />
        <StatCard label={t("live.tokensOut")} value={formatNumber(s.outputTokens)} accent="#eb6834" icon={<ArrowUpFromLine className="h-4 w-4" />} />
        <StatCard label={t("live.cost")} value={formatUsd(s.costUsd)} accent="#e34948" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label={t("live.turns")} value={formatNumber(s.turnCount)} accent="#2a78d6" icon={<Repeat className="h-4 w-4" />} />
        <StatCard label={t("live.duration")} value={formatDuration(durationMs)} accent="#4a3aa7" icon={<Clock className="h-4 w-4" />} />
      </div>

      <Card title={`${t("live.timeline")} (${events.length})`}>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t("live.noEvents")}</p>
        ) : (
          <div className="flex flex-col">
            {events.map((e, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-[var(--border)] py-2 last:border-0">
                <span className="w-16 shrink-0 pt-0.5 text-xs text-[var(--text-muted)]">{formatRelativeTime(e.at)}</span>
                {e.kind === "turn" ? (
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">Turn</span> <span className="text-[var(--text-muted)]">{e.model}</span>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {formatNumber(e.inputTokens)} in / {formatNumber(e.outputTokens)} out · {formatUsd(e.costUsd)}
                      {e.stopReason ? ` · ${e.stopReason}` : ""}
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-mono font-medium">{e.toolName}</span>{" "}
                    <span className={`inline-flex align-middle ${e.status === "ERROR" ? "text-[#e34948]" : "text-[var(--text-muted)]"}`}>
                      {e.status === "SUCCESS" ? <Check className="h-4 w-4" /> : e.status === "ERROR" ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
                    </span>
                    {e.durationMs != null && <span className="text-xs text-[var(--text-muted)]"> · {formatDuration(e.durationMs)}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
