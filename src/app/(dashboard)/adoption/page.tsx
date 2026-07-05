import { getAdoptionStats, getCohortRetention, type RangeKey, type AdoptionPhase } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { RangeSelector } from "@/components/RangeSelector";
import { TrendChart } from "@/components/charts/TrendChart";
import { RankBarChart } from "@/components/charts/RankBarChart";
import { Badge, Tag } from "@/components/ui/Badge";
import { formatNumber, formatPercent, formatDay } from "@/lib/format";
import { colorForIndex } from "@/lib/chart-colors";
import { ANNOTATIONS } from "@/lib/annotations";
import { Activity, CalendarDays, CalendarRange, Repeat } from "lucide-react";

const PHASE_LABELS: Record<AdoptionPhase, string> = {
  power: "Power user (≥12 ngày/28)",
  regular: "Thường xuyên (5–11)",
  trial: "Thử nghiệm (1–4)",
  inactive: "Ngừng / chưa dùng (0)",
};

export default async function AdoptionPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const [a, cohort] = await Promise.all([getAdoptionStats(r), getCohortRetention(8)]);

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            MỨC ĐỘ ÁP DỤNG
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Mức độ <span className="gradient-text">áp dụng</span> (Adoption)</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Ai đang thực sự dùng Claude, mức độ đều đặn và độ phủ theo nhóm
          </p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="DAU trung bình" value={formatNumber(a.current.avgDau)} hint="28 ngày gần nhất" accent="#2a78d6" icon={<Activity className="h-4 w-4" />} />
        <StatCard label="WAU" value={formatNumber(a.current.wau)} hint="7 ngày gần nhất" accent="#1baf7a" icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="MAU" value={formatNumber(a.current.mau)} hint="28 ngày gần nhất" accent="#4a3aa7" icon={<CalendarRange className="h-4 w-4" />} />
        <StatCard
          label="Stickiness (DAU/MAU)"
          value={formatPercent(a.current.stickiness)}
          hint="Càng cao càng dùng đều"
          accent="#eda100"
          icon={<Repeat className="h-4 w-4" />}
        />
      </div>

      <Card title="Người dùng hoạt động theo ngày (DAU)">
        <TrendChart
          data={a.dauSeries}
          series={[{ key: "users", label: "Người dùng", color: "#2a78d6" }]}
          annotations={ANNOTATIONS}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Phân bố giai đoạn áp dụng (28 ngày)">
          <RankBarChart
            data={(Object.keys(a.phases) as AdoptionPhase[]).map((k) => ({
              label: PHASE_LABELS[k],
              value: a.phases[k],
            }))}
            valueFormat="number"
          />
        </Card>

        <Card
          title="Độ phủ theo nhóm"
          action={
            <span className="text-xs text-[var(--text-muted)]">
              Toàn công ty: {a.coverage.activeInRange}/{a.coverage.totalUsers} ({formatPercent(a.coverage.pct)})
            </span>
          }
        >
          {a.coverage.byTeam.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>
          ) : (
            <div className="flex flex-col gap-3">
              {a.coverage.byTeam.map((t, i) => (
                <div key={t.team}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{t.team}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {t.active}/{t.total} · {formatPercent(t.pct)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${t.pct * 100}%`, background: colorForIndex(i) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Phễu áp dụng">
          <div className="flex flex-col gap-3">
            {a.funnel.map((f, i) => {
              const pct = a.funnel[0].count > 0 ? f.count / a.funnel[0].count : 0;
              return (
                <div key={f.stage}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{f.stage}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatNumber(f.count)} · {formatPercent(pct)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded bg-black/5 dark:bg-white/10">
                    <div className="h-full rounded" style={{ width: `${pct * 100}%`, background: colorForIndex(i) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Giữ chân theo cohort tuần">
          {cohort.rows.every((r2) => r2.size === 0) ? (
            <p className="text-sm text-[var(--text-muted)]">Chưa đủ dữ liệu</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr className="text-[var(--text-muted)]">
                    <th className="px-2 py-1 text-left font-medium">Cohort</th>
                    <th className="px-2 py-1 text-right font-medium">Cỡ</th>
                    {Array.from({ length: cohort.maxOffset + 1 }, (_, k) => (
                      <th key={k} className="px-2 py-1 text-center font-medium">T+{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohort.rows.map((row) => (
                    <tr key={row.cohort}>
                      <td className="px-2 py-1 whitespace-nowrap">{formatDay(row.cohort)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{row.size}</td>
                      {row.cells.map((c, k) => (
                        <td
                          key={k}
                          className="px-2 py-1 text-center tabular-nums"
                          style={{ background: c != null ? `rgba(42,120,214,${0.08 + 0.8 * c})` : "transparent" }}
                        >
                          {c != null ? formatPercent(c, 0) : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Power users">
          {a.powerUsers.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Chưa có</p>
          ) : (
            <div className="flex flex-col gap-2">
              {a.powerUsers.map((u) => (
                <div key={u.userId} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{u.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{u.activeDays} ngày/28</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Người dùng mới"
          action={<Badge variant="good">{a.newAdopters.length}</Badge>}
        >
          {a.newAdopters.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Không có trong kỳ</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {a.newAdopters.slice(0, 20).map((u) => (
                <Tag key={u.userId}>{u.name}</Tag>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Đã ngừng dùng (>14 ngày)"
          action={<Badge variant={a.churned.length > 0 ? "critical" : "neutral"}>{a.churned.length}</Badge>}
        >
          {a.churned.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Không có</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {a.churned.slice(0, 20).map((u) => (
                <Tag key={u.userId}>{u.name}</Tag>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
