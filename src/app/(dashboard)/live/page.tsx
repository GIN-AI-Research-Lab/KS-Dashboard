import { getRecentSessions } from "@/lib/stats";
import { LiveFeed } from "@/components/live/LiveFeed";
import type { LiveSessionCard } from "@/components/live/types";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const sessions = await getRecentSessions(50);

  const initialSessions: LiveSessionCard[] = sessions.map((s) => ({
    id: s.id,
    externalId: s.externalId,
    userId: s.userId,
    userName: s.user.name,
    team: s.user.team?.name ?? null,
    department: s.user.department?.name ?? null,
    projectLabel: s.projectLabel,
    model: s.model,
    status: s.status,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt ? s.endedAt.toISOString() : null,
    lastEventAt: s.lastEventAt.toISOString(),
    inputTokens: s.inputTokens,
    outputTokens: s.outputTokens,
    costUsd: s.costUsd,
    turnCount: s.turnCount,
    promptCount: s.promptCount,
    toolCallCount: s.toolCallCount,
    toolCalls: s.toolCalls.map((tc) => ({
      id: tc.id,
      toolName: tc.toolName,
      status: tc.status,
      startedAt: tc.startedAt.toISOString(),
      endedAt: tc.endedAt ? tc.endedAt.toISOString() : null,
      durationMs: tc.durationMs,
    })),
  }));

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 animate-pulse rounded-full" />
            TRỰC TIẾP
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Phiên <span className="gradient-text">trực tuyến</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Theo dõi các phiên Claude Code đang diễn ra theo thời gian thực
          </p>
        </div>
      </div>
      <LiveFeed initialSessions={initialSessions} />
    </div>
  );
}
