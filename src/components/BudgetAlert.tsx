import { getMonthToDateCost } from "@/lib/stats";
import { MONTHLY_BUDGET_USD, BUDGET_WARN_AT } from "@/lib/budget-config";
import { formatUsd, formatPercent } from "@/lib/format";
import { TrendingUp, AlertTriangle, CircleAlert } from "lucide-react";

// Company monthly-budget progress + alert. Config-driven (no DB). Renders
// green/amber/red by how much of the budget is consumed month-to-date.
export async function BudgetAlert() {
  const spent = await getMonthToDateCost();
  const ratio = MONTHLY_BUDGET_USD > 0 ? spent / MONTHLY_BUDGET_USD : 0;

  const state =
    ratio >= 1 ? "critical" : ratio >= BUDGET_WARN_AT ? "warning" : "good";
  const color =
    state === "critical"
      ? "var(--status-critical)"
      : state === "warning"
        ? "var(--status-warning)"
        : "var(--status-good)";
  const Icon = state === "good" ? TrendingUp : state === "warning" ? AlertTriangle : CircleAlert;
  const message =
    state === "critical"
      ? "Đã vượt ngân sách tháng"
      : state === "warning"
        ? "Sắp chạm ngân sách tháng"
        : "Chi phí tháng trong ngân sách";

  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]"
      style={{ borderColor: state === "good" ? undefined : `color-mix(in srgb, ${color} 45%, var(--border))` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          {message}
        </span>
        <span className="text-sm tabular-nums text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">{formatUsd(spent)}</span> / {formatUsd(MONTHLY_BUDGET_USD)}
          <span className="ml-1.5 font-medium" style={{ color }}>
            ({formatPercent(ratio)})
          </span>
        </span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[var(--gridline)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ratio * 100)}%`, background: color }} />
      </div>
    </div>
  );
}
