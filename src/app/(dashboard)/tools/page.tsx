import { getToolStats, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { RankBarChart } from "@/components/charts/RankBarChart";
import { ExportLink } from "@/components/ExportLink";
import { formatNumber, formatPercent, formatDuration } from "@/lib/format";

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const { totals, tools } = await getToolStats(r);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Phân tích công cụ (Tool)</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Công cụ Claude Code dùng nhiều nhất, tỷ lệ lỗi và thời gian trung bình
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng lượt gọi" value={formatNumber(totals.total)} accent="#2a78d6" icon="⚡" />
        <StatCard label="Số loại công cụ" value={formatNumber(totals.uniqueTools)} accent="#4a3aa7" icon="⛭" />
        <StatCard
          label="Tỷ lệ lỗi"
          value={formatPercent(totals.errorRate)}
          hint={`${formatNumber(totals.errorTotal)} lượt lỗi`}
          accent="#e34948"
          icon="!"
        />
        <StatCard
          label="Thời gian TB"
          value={totals.avgDurationMs != null ? formatDuration(totals.avgDurationMs) : "—"}
          accent="#1baf7a"
          icon="◷"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Top công cụ theo lượt gọi" className="xl:col-span-1">
          <RankBarChart
            data={tools.slice(0, 12).map((t) => ({ label: t.toolName, value: t.total }))}
            valueFormat="number"
          />
        </Card>

        <Card
          title="Chi tiết theo công cụ"
          className="xl:col-span-2"
          action={<ExportLink href={`/api/export/tools?range=${r}`} />}
        >
          {tools.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="py-2 pr-4 font-medium">Công cụ</th>
                    <th className="py-2 pr-4 text-right font-medium">Lượt gọi</th>
                    <th className="py-2 pr-4 text-right font-medium">Thành công</th>
                    <th className="py-2 pr-4 text-right font-medium">Lỗi</th>
                    <th className="py-2 pr-4 text-right font-medium">Tỷ lệ lỗi</th>
                    <th className="py-2 text-right font-medium">Thời gian TB</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((t) => (
                    <tr key={t.toolName} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 pr-4 font-mono text-[13px]">{t.toolName}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(t.total)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-[var(--text-secondary)]">
                        {formatNumber(t.success)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        <span className={t.error > 0 ? "text-[#e34948]" : "text-[var(--text-muted)]"}>
                          {formatNumber(t.error)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        <span className={t.errorRate > 0.1 ? "text-[#e34948]" : "text-[var(--text-secondary)]"}>
                          {formatPercent(t.errorRate)}
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums text-[var(--text-secondary)]">
                        {t.avgDurationMs != null ? formatDuration(t.avgDurationMs) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
