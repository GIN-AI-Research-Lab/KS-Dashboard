import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  accent,
  icon,
  deltaPct,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  icon?: ReactNode;
  deltaPct?: number | null;
}) {
  const hasDelta = typeof deltaPct === "number" && isFinite(deltaPct);
  const up = hasDelta && (deltaPct as number) >= 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
        {icon && (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `${accent ?? "#2a78d6"}1a`, color: accent ?? "#2a78d6" }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
      </div>
      {hasDelta && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          <span className={up ? "text-[#0ca30c]" : "text-[#e34948]"}>
            {up ? "▲" : "▼"} {Math.abs(deltaPct as number).toFixed(1)}%
          </span>
          <span className="text-[var(--text-muted)]">vs kỳ trước</span>
        </div>
      )}
      {hint && <div className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</div>}
    </div>
  );
}
