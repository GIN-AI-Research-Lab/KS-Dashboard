import Link from "next/link";
import { getSessionLibrary } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { Badge, Tag } from "@/components/ui/Badge";
import { SessionFilters } from "@/components/SessionFilters";
import { OUTCOME_LABEL, OUTCOME_VARIANT, parseTags } from "@/lib/session-outcome";
import { formatUsd, formatRelativeTime } from "@/lib/format";
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

  const rows = await getSessionLibrary({
    outcome: validOutcome,
    featured: featured === "1",
    q: q || undefined,
  });

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)] backdrop-blur">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            THƯ VIỆN
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Thư viện <span className="gradient-text">phiên</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Ghi chú, đánh dấu kết quả và tìm lại các phiên đã xử lý được vấn đề
          </p>
        </div>
      </div>

      <SessionFilters />

      <Card title={`${rows.length} phiên`}>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Không có phiên nào khớp bộ lọc</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-2 pr-4 font-medium">Dự án</th>
                  <th className="py-2 pr-4 font-medium">Người</th>
                  <th className="py-2 pr-4 font-medium">Kết quả</th>
                  <th className="py-2 pr-4 font-medium">Tags</th>
                  <th className="py-2 pr-4 text-right font-medium">Chi phí</th>
                  <th className="py-2 text-right font-medium">Gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--border)] last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <td className="py-2 pr-4">
                      <Link href={`/sessions/${s.id}`} className="font-medium text-accent transition-colors hover:underline">
                        {s.featured ? "★ " : ""}
                        {s.projectLabel ?? "(không rõ dự án)"}
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
