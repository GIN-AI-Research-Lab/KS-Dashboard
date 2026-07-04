import { getProjectStats, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { RankBarChart } from "@/components/charts/RankBarChart";
import { formatNumber, formatUsd } from "@/lib/format";
import { Folders, FilePen, Terminal, Zap } from "lucide-react";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const { projects, totals } = await getProjectStats(r);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)] backdrop-blur">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            DỰ ÁN
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Theo <span className="gradient-text">dự án</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Dự án nào dùng Claude nhiều nhất, kèm proxy sản lượng (sửa file, chạy lệnh)
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Số dự án" value={formatNumber(totals.projectCount)} accent="#4a3aa7" icon={<Folders className="h-4 w-4" />} />
        <StatCard label="Sửa file (Edit/Write)" value={formatNumber(totals.editWrites)} accent="#1baf7a" icon={<FilePen className="h-4 w-4" />} />
        <StatCard label="Lệnh Bash" value={formatNumber(totals.bashRuns)} accent="#eb6834" icon={<Terminal className="h-4 w-4" />} />
        <StatCard label="Tổng lượt gọi tool" value={formatNumber(totals.toolCalls)} accent="#2a78d6" icon={<Zap className="h-4 w-4" />} />
      </div>

      <Card title="Chi phí theo dự án">
        <RankBarChart
          data={projects.slice(0, 12).map((p) => ({ label: p.project, value: p.costUsd }))}
          valueFormat="usd"
        />
      </Card>

      <Card title="Chi tiết theo dự án">
        {projects.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-2 pr-4 font-medium">Dự án</th>
                  <th className="py-2 pr-4 text-right font-medium">Phiên</th>
                  <th className="py-2 pr-4 text-right font-medium">Turns</th>
                  <th className="py-2 pr-4 text-right font-medium">Token</th>
                  <th className="py-2 pr-4 text-right font-medium">Sửa file</th>
                  <th className="py-2 pr-4 text-right font-medium">Bash</th>
                  <th className="py-2 text-right font-medium">Chi phí</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.project} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-4 font-medium">{p.project}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(p.sessions)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(p.turnCount)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(p.totalTokens)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-[var(--text-secondary)]">{formatNumber(p.editWrites)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-[var(--text-secondary)]">{formatNumber(p.bashRuns)}</td>
                    <td className="py-2 text-right tabular-nums">{formatUsd(p.costUsd)}</td>
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
