import { getCostInsights, type RangeKey } from "@/lib/stats";
import { MINUTES_SAVED_PER_TURN, DEV_HOURLY_USD } from "@/lib/roi-config";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { RankBarChart } from "@/components/charts/RankBarChart";
import { Badge } from "@/components/ui/Badge";
import { formatNumber, formatUsd } from "@/lib/format";

export default async function RoiPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const c = await getCostInsights(r);

  const topTier = c.byTier[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Hiệu quả &amp; Chi phí</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Chi phí, tiền tiết kiệm nhờ cache, dự báo và ước tính ROI
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Chi phí kỳ này" value={formatUsd(c.spendUsd)} accent="#e34948" icon="$" />
        <StatCard
          label="Tiết kiệm nhờ cache"
          value={formatUsd(c.cacheSavingsUsd)}
          hint="So với trả giá input đầy đủ"
          accent="#008300"
          icon="⚡"
        />
        <StatCard
          label="Dự báo cuối tháng"
          value={formatUsd(c.forecast.projectedMonthUsd)}
          hint={`${formatUsd(c.forecast.spendThisMonth)} sau ${c.forecast.daysElapsed}/${c.forecast.daysInMonth} ngày`}
          accent="#eda100"
          icon="◷"
        />
        <StatCard
          label="ROI ước tính"
          value={c.roi.roiRatio != null ? `${c.roi.roiRatio.toFixed(1)}×` : "—"}
          hint="Giá trị năng suất / chi phí"
          accent="#4a3aa7"
          icon="≷"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Ước tính giá trị năng suất">
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Số turns</span>
              <span className="font-semibold tabular-nums">{formatNumber(c.roi.turnCount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Thời gian tiết kiệm (ước tính)</span>
              <span className="font-semibold tabular-nums">{formatNumber(c.roi.timeSavedHours)} giờ</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Giá trị năng suất (ước tính)</span>
              <span className="font-semibold tabular-nums">{formatUsd(c.roi.productivityValueUsd)}</span>
            </div>
            <div className="h-px bg-[var(--gridline)]" />
            <p className="text-xs text-[var(--text-muted)]">
              Giả định: {MINUTES_SAVED_PER_TURN} phút tiết kiệm / turn, {formatUsd(DEV_HOURLY_USD)}/giờ.
              Chỉnh trong <code className="font-mono">src/lib/roi-config.ts</code>. Đây là ước tính, không phải số đo thực tế.
            </p>
          </div>
        </Card>

        <Card title="Chi phí theo cấp model (tier)">
          {c.byTier.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>
          ) : (
            <>
              <RankBarChart
                data={c.byTier.map((t) => ({ label: t.tier, value: t.costUsd }))}
                valueFormat="usd"
              />
              {topTier && topTier.tier === "Opus" && (
                <p className="mt-3 text-xs text-[var(--text-muted)]">
                  Phần lớn chi phí nằm ở tier Opus. Cân nhắc chuyển các việc đơn giản (tra cứu,
                  chỉnh sửa nhỏ) sang Sonnet/Haiku để giảm chi phí.
                </p>
              )}
            </>
          )}
        </Card>
      </div>

      <Card
        title="Cảnh báo chi phí tăng đột biến (7 ngày vs 21 ngày trước)"
        action={<Badge variant={c.spikes.length > 0 ? "warning" : "neutral"}>{c.spikes.length}</Badge>}
      >
        {c.spikes.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Không có bất thường đáng kể</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="py-2 pr-4 font-medium">Nhân viên</th>
                  <th className="py-2 pr-4 text-right font-medium">7 ngày qua</th>
                  <th className="py-2 pr-4 text-right font-medium">Nền (7 ngày)</th>
                  <th className="py-2 text-right font-medium">Tăng</th>
                </tr>
              </thead>
              <tbody>
                {c.spikes.map((s) => (
                  <tr key={s.userId} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-4 font-medium">{s.name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatUsd(s.recent7)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-[var(--text-secondary)]">{formatUsd(s.baseline7)}</td>
                    <td className="py-2 text-right tabular-nums text-[#e34948]">
                      {isFinite(s.ratio) ? `${s.ratio.toFixed(1)}×` : "mới"}
                    </td>
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
