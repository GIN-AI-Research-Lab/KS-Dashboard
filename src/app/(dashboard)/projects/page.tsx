import { getProjectStats, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { RankBarChart } from "@/components/charts/RankBarChart";
import { formatNumber, formatUsd } from "@/lib/format";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const { projects, totals } = await getProjectStats(r);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Theo dự án</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Dự án nào dùng Claude nhiều nhất, kèm proxy sản lượng (sửa file, chạy lệnh)
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Số dự án" value={formatNumber(totals.projectCount)} accent="#4a3aa7" icon="◧" />
        <StatCard label="Sửa file (Edit/Write)" value={formatNumber(totals.editWrites)} accent="#1baf7a" icon="✎" />
        <StatCard label="Lệnh Bash" value={formatNumber(totals.bashRuns)} accent="#eb6834" icon="$_" />
        <StatCard label="Tổng lượt gọi tool" value={formatNumber(totals.toolCalls)} accent="#2a78d6" icon="⚡" />
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
