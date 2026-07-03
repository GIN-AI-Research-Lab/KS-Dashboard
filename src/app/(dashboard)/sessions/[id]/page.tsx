import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getSessionDetail, detectSessionAutoSuccess } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { SessionAnnotationForm } from "@/components/SessionAnnotationForm";
import { SessionDiscussion } from "@/components/SessionDiscussion";
import { formatNumber, formatUsd, formatDuration, formatRelativeTime } from "@/lib/format";
import type { SessionStatus } from "@prisma/client";

const STATUS_LABEL: Record<SessionStatus, string> = { ACTIVE: "Đang chạy", IDLE: "Chờ", ENDED: "Kết thúc" };

type TimelineEvent =
  | { kind: "turn"; at: Date; model: string; inputTokens: number; outputTokens: number; costUsd: number; stopReason: string | null }
  | { kind: "tool"; at: Date; toolName: string; status: string; durationMs: number | null };

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, s] = await Promise.all([auth(), getSessionDetail(id)]);
  if (!s) notFound();

  const canEdit = session!.user.role === "ADMIN" || session!.user.id === s.userId;
  const durationMs = (s.endedAt ?? s.lastEventAt).getTime() - s.startedAt.getTime();
  const auto = detectSessionAutoSuccess(s.toolCalls);
  const up = s.feedback.filter((f) => f.value === 1).length;
  const down = s.feedback.filter((f) => f.value === -1).length;
  const myVote = s.feedback.find((f) => f.userId === session!.user.id)?.value ?? 0;

  const events: TimelineEvent[] = [
    ...s.turns.map((t) => ({
      kind: "turn" as const,
      at: t.createdAt,
      model: t.model,
      inputTokens: t.inputTokens,
      outputTokens: t.outputTokens,
      costUsd: t.costUsd,
      stopReason: t.stopReason,
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/sessions" className="text-xs text-[var(--text-muted)] hover:underline">
            ← Thư viện phiên
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {s.projectLabel ?? "Phiên không rõ dự án"}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            <Link href={`/users/${s.userId}`} className="hover:underline">{s.user.name}</Link>
            {s.model ? ` · ${s.model}` : ""}
            {s.user.team ? ` · ${s.user.team.name}` : ""}
            {" · "}bắt đầu {formatRelativeTime(s.startedAt)}
          </p>
        </div>
        <Badge variant={s.status === "ACTIVE" ? "good" : s.status === "IDLE" ? "warning" : "neutral"}>
          {STATUS_LABEL[s.status]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Token vào" value={formatNumber(s.inputTokens)} accent="#1baf7a" icon="→" />
        <StatCard label="Token ra" value={formatNumber(s.outputTokens)} accent="#eb6834" icon="←" />
        <StatCard label="Chi phí" value={formatUsd(s.costUsd)} accent="#e34948" icon="$" />
        <StatCard label="Turns" value={formatNumber(s.turnCount)} accent="#2a78d6" icon="⟳" />
        <StatCard label="Thời lượng" value={formatDuration(durationMs)} accent="#4a3aa7" icon="◷" />
      </div>

      <Card title="Ghi chú & kết quả">
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
            auto.likely
              ? "border-[#0ca30c]/30 bg-[#0ca30c]/5 text-[#0ca30c]"
              : "border-[var(--border)] bg-black/[0.02] text-[var(--text-muted)] dark:bg-white/[0.03]"
          }`}
        >
          <span className="font-medium">Tự động nhận diện:</span>{" "}
          {auto.likely ? "Có vẻ đã xử lý xong" : "Chưa rõ kết quả"} — {auto.reason}
        </div>
        <SessionAnnotationForm
          sessionId={s.id}
          canEdit={canEdit}
          initialOutcome={s.outcome}
          initialNote={s.note}
          initialTags={s.tags}
          initialFeatured={s.featured}
        />
      </Card>

      <Card title="Thảo luận & đánh giá">
        <SessionDiscussion
          sessionId={s.id}
          initialUp={up}
          initialDown={down}
          initialMyVote={myVote}
          initialComments={s.comments.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            authorName: c.author.name,
          }))}
        />
      </Card>

      <Card title={`Dòng thời gian (${events.length} sự kiện)`}>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Chưa có sự kiện</p>
        ) : (
          <div className="flex flex-col">
            {events.map((e, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-[var(--border)] py-2 last:border-0">
                <span className="w-16 shrink-0 pt-0.5 text-xs text-[var(--text-muted)]">
                  {formatRelativeTime(e.at)}
                </span>
                {e.kind === "turn" ? (
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">Turn</span>{" "}
                    <span className="text-[var(--text-muted)]">{e.model}</span>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {formatNumber(e.inputTokens)} in / {formatNumber(e.outputTokens)} out · {formatUsd(e.costUsd)}
                      {e.stopReason ? ` · ${e.stopReason}` : ""}
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-mono font-medium">{e.toolName}</span>{" "}
                    <span className={e.status === "ERROR" ? "text-[#e34948]" : "text-[var(--text-muted)]"}>
                      {e.status === "SUCCESS" ? "✓" : e.status === "ERROR" ? "✕" : "⋯"}
                    </span>
                    {e.durationMs != null && (
                      <span className="text-xs text-[var(--text-muted)]"> · {formatDuration(e.durationMs)}</span>
                    )}
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
