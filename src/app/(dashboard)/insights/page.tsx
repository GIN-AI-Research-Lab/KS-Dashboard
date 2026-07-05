import { getInsightsStats, getToolSankey, getTeamModelPivot, getCodeStats, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { RankBarChart, ToolSankey } from "@/components/charts/lazy";
import { formatNumber, formatDuration, formatPercent, formatDay, formatRelativeTime } from "@/lib/format";
import { colorForModel } from "@/lib/chart-colors";
import { METRIC_HELP } from "@/lib/glossary";
import { Plus, Minus, Check, AlertTriangle, TrendingUp } from "lucide-react";

function PercentileRow({ label, ms }: { label: string; ms: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-semibold tabular-nums">{formatDuration(ms)}</span>
    </div>
  );
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const [s, sankey, pivot, code] = await Promise.all([
    getInsightsStats(r),
    getToolSankey(r),
    getTeamModelPivot(r),
    getCodeStats(r),
  ]);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            PHÂN TÍCH
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Phân tích <span className="gradient-text">sâu</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Độ trễ, chất lượng phiên, tỷ trọng model theo thời gian và đỉnh đồng thời
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Kỹ thuật &amp; chất lượng (dữ liệu mở rộng)
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Dòng code thêm" value={formatNumber(code.linesAdded)} tooltip={METRIC_HELP.linesAdded} accent="#008300" icon={<Plus className="h-4 w-4" />} />
          <StatCard label="Dòng code xoá" value={formatNumber(code.linesRemoved)} tooltip={METRIC_HELP.linesRemoved} accent="#e34948" icon={<Minus className="h-4 w-4" />} />
          <StatCard
            label="Tỷ lệ chấp nhận sửa"
            value={code.editsAccepted + code.editsRejected > 0 ? formatPercent(code.acceptanceRate) : "—"}
            hint={`${code.editsAccepted}/${code.editsAccepted + code.editsRejected} chấp nhận`}
            tooltip={METRIC_HELP.acceptanceRate}
            accent="var(--accent)"
            icon={<Check className="h-4 w-4" />}
          />
          <StatCard label="API errors" value={formatNumber(code.apiErrors)} tooltip="Số lỗi khi Claude gọi API (ví dụ quá tải, hết thời gian chờ)." accent="#eb6834" icon={<AlertTriangle className="h-4 w-4" />} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title={`Độ trễ API (${formatNumber(code.apiLatency.count)} request)`}
          titleTip="Thời gian Claude phản hồi một yêu cầu; p50/p90/p99 là mức phân vị (p90 = 90% yêu cầu nhanh hơn giá trị này)."
        >
          <div className="flex flex-col gap-2">
            <PercentileRow label="p50 (trung vị)" ms={code.apiLatency.p50} />
            <PercentileRow label="p90" ms={code.apiLatency.p90} />
            <PercentileRow label="p99" ms={code.apiLatency.p99} />
          </div>
        </Card>
        <Card
          title={`Time-to-first-token (${formatNumber(code.ttft.count)} request)`}
          titleTip="Thời gian từ lúc gửi yêu cầu đến khi nhận được token đầu tiên của câu trả lời."
        >
          <div className="flex flex-col gap-2">
            <PercentileRow label="p50 (trung vị)" ms={code.ttft.p50} />
            <PercentileRow label="p90" ms={code.ttft.p90} />
            <PercentileRow label="p99" ms={code.ttft.p99} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title={`Độ trễ công cụ (${formatNumber(s.toolLatency.count)} lượt)`}
          titleTip="Thời gian chạy một công cụ (đọc/sửa file, chạy lệnh…); p50/p90/p99 là mức phân vị."
        >
          <div className="flex flex-col gap-2">
            <PercentileRow label="p50 (trung vị)" ms={s.toolLatency.p50} />
            <PercentileRow label="p90" ms={s.toolLatency.p90} />
            <PercentileRow label="p99" ms={s.toolLatency.p99} />
          </div>
        </Card>

        <Card
          title={`Thời lượng phiên (${formatNumber(s.sessionDuration.count)} phiên)`}
          titleTip="Độ dài mỗi phiên làm việc; p50/p90/p99 là mức phân vị (p90 = 90% phiên ngắn hơn giá trị này)."
        >
          <div className="flex flex-col gap-2">
            <PercentileRow label="p50 (trung vị)" ms={s.sessionDuration.p50} />
            <PercentileRow label="p90" ms={s.sessionDuration.p90} />
            <PercentileRow label="p99" ms={s.sessionDuration.p99} />
          </div>
        </Card>

        <StatCard
          label="Đỉnh phiên đồng thời"
          tooltip="Số phiên chạy cùng lúc cao nhất ghi nhận trong kỳ."
          value={formatNumber(s.peakConcurrency.peak)}
          hint={s.peakConcurrency.peakAt ? `Lúc ${formatRelativeTime(s.peakConcurrency.peakAt)}` : undefined}
          accent="#e34948"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Nguồn khởi tạo phiên">
          <RankBarChart data={s.bySource.map((x) => ({ label: x.source, value: x.count }))} valueFormat="number" />
        </Card>
        <Card
          title="Lý do kết thúc turn (stop reason)"
          titleTip="Vì sao model dừng mỗi lượt trả lời (trả lời xong, gọi công cụ, chạm giới hạn độ dài…)."
        >
          <RankBarChart data={s.byStopReason.map((x) => ({ label: x.stopReason, value: x.count }))} valueFormat="number" />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Phân bố thời lượng phiên">
          <RankBarChart data={s.durationHistogram.map((h) => ({ label: h.label, value: h.count }))} valueFormat="number" />
        </Card>

        <Card
          title="Token theo nhóm × model (pivot)"
          titleTip="Bảng chéo: mỗi ô là số token một nhóm dùng trên một model."
        >
          {pivot.rows.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="px-2 py-1 text-left font-medium">Nhóm</th>
                    {pivot.models.map((m) => (
                      <th key={m} className="px-2 py-1 text-right font-medium">{m}</th>
                    ))}
                    <th className="px-2 py-1 text-right font-medium">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {pivot.rows.map((row) => (
                    <tr key={row.team} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-2 py-1">{row.team}</td>
                      {row.cells.map((c, k) => (
                        <td key={k} className="px-2 py-1 text-right tabular-nums text-[var(--text-secondary)]">
                          {c > 0 ? formatNumber(c) : "—"}
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-medium tabular-nums">{formatNumber(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card title="Luồng chuyển tiếp công cụ (tool này → tool kế tiếp)">
        <ToolSankey nodes={sankey.nodes} links={sankey.links} />
      </Card>

      <Card title="Tỷ trọng model theo tuần (theo token)">
        {s.modelMix.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              {s.topModels.map((m) => (
                <span key={m} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorForModel(m) }} />
                  {m}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              {s.modelMix.map((w) => (
                <div key={w.week}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{formatDay(w.week)}</span>
                    <span className="text-[var(--text-muted)]">{formatNumber(w.total)} token</span>
                  </div>
                  <div className="flex h-4 w-full overflow-hidden rounded-md bg-black/5 dark:bg-white/10">
                    {w.segments.map((seg) => (
                      <div
                        key={seg.model}
                        title={`${seg.model}: ${formatPercent(seg.pct)}`}
                        style={{ width: `${seg.pct * 100}%`, background: colorForModel(seg.model) }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
