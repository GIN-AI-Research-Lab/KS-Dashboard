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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Phiên trực tuyến</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Theo dõi các phiên Claude Code đang diễn ra theo thời gian thực
        </p>
      </div>
      <LiveFeed initialSessions={initialSessions} />
    </div>
  );
}
