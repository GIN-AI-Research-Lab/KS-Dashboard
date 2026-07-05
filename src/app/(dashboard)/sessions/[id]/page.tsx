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
import { ArrowDownToLine, ArrowUpFromLine, DollarSign, Repeat, Clock, Check, X, MoreHorizontal } from "lucide-react";
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
    <div className="stagger flex flex-col gap-6">
      <Link href="/sessions" className="text-xs text-[var(--text-muted)] transition-colors hover:text-accent hover:underline">
        ← Thư viện phiên
      </Link>
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            CHI TIẾT PHIÊN
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            <span className="gradient-text">Phiên</span> {s.projectLabel ?? "chưa rõ dự án"}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            <Link href={`/users/${s.userId}`} className="transition-colors hover:text-accent hover:underline">{s.user.name}</Link>
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
        <StatCard label="Token vào" value={formatNumber(s.inputTokens)} accent="#1baf7a" icon={<ArrowDownToLine className="h-4 w-4" />} />
        <StatCard label="Token ra" value={formatNumber(s.outputTokens)} accent="#eb6834" icon={<ArrowUpFromLine className="h-4 w-4" />} />
        <StatCard label="Chi phí" value={formatUsd(s.costUsd)} accent="#e34948" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Turns" value={formatNumber(s.turnCount)} accent="#2a78d6" icon={<Repeat className="h-4 w-4" />} />
        <StatCard label="Thời lượng" value={formatDuration(durationMs)} accent="#4a3aa7" icon={<Clock className="h-4 w-4" />} />
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
                    <span className={`inline-flex align-middle ${e.status === "ERROR" ? "text-[#e34948]" : "text-[var(--text-muted)]"}`}>
                      {e.status === "SUCCESS" ? <Check className="h-4 w-4" /> : e.status === "ERROR" ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
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
