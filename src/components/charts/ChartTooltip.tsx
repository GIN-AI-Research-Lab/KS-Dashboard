"use client";

// Shared Recharts tooltip content styled with the dashboard design tokens
// (rounded card, hairline border, tinted shadow, ink text, series-colored dot).
// Themed automatically via CSS vars, so it reads correctly in light and dark.

type TooltipEntry = {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown> & { fill?: string; stroke?: string };
};

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  hideName = false,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (value: number) => string;
  hideName?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const heading =
    label != null && label !== ""
      ? labelFormatter
        ? labelFormatter(label)
        : String(label)
      : null;

  return (
    <div className="min-w-[8rem] rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 shadow-[var(--shadow-md)]">
      {heading && (
        <div className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">{heading}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((p, i) => {
          const color = p.color ?? p.payload?.fill ?? p.payload?.stroke ?? "var(--accent)";
          const val = valueFormatter ? valueFormatter(Number(p.value)) : String(p.value);
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
              {!hideName && p.name != null && p.name !== "" && (
                <span className="text-[var(--text-muted)]">{p.name}</span>
              )}
              <span className="ml-auto pl-4 font-semibold tabular-nums text-[var(--text-primary)]">
                {val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
