import { getModelLeaderboard, type RangeKey } from "@/lib/stats";
import { Card } from "@/components/ui/Card";
import { RangeSelector } from "@/components/RangeSelector";
import { ModelDonut } from "@/components/charts/lazy";
import { formatNumber, formatUsd } from "@/lib/format";
import { colorForModel } from "@/lib/chart-colors";
import { getT } from "@/i18n/server";

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const r = (range ?? "30d") as RangeKey;
  const [models, t] = await Promise.all([getModelLeaderboard(r), getT()]);
  const maxTokens = Math.max(1, ...models.map((m) => m.totalTokens));

  return (
    <div className="stagger flex flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            {t("models.badge")}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("models.title")}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("models.subtitle")}</p>
        </div>
        <RangeSelector defaultRange={r} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title={t("models.tokenShare")} className="xl:col-span-1">
          <ModelDonut data={models} height={280} />
        </Card>

        <Card title={t("models.detail")} className="xl:col-span-2">
          <div className="flex flex-col gap-4">
            {models.map((m) => {
              const color = colorForModel(m.model);
              const pct = (m.totalTokens / maxTokens) * 100;
              return (
                <div key={m.model}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      {m.model}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {m.turns} {t("metrics.unitTurns")} · {m.users} {t("models.users")}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-[var(--text-secondary)]">
                    <span>
                      {formatNumber(m.inputTokens)} in / {formatNumber(m.outputTokens)} out
                    </span>
                    <span>{formatUsd(m.costUsd)}</span>
                  </div>
                </div>
              );
            })}
            {models.length === 0 && <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
