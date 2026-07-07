// Server-rendered heatmap: rows = weekday (Mon..Sun), columns = hour (0..23).
// Intensity is a single-hue sequential encoding over the accent color, mixed
// toward transparent by count; the accent var adapts to light/dark themes.

import { getT } from "@/i18n/server";

export async function ActivityHeatmap({ grid, max }: { grid: number[][]; max: number }) {
  const t = await getT();
  const WEEKDAYS = t("ui.weekdaysShort").split(",");
  if (max === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-[var(--text-muted)]">
        {t("table.noData")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        {/* hour axis labels */}
        <div className="mb-1 flex pl-8">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-[var(--text-muted)]">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>

        {grid.map((row, day) => (
          <div key={day} className="flex items-center">
            <div className="w-8 shrink-0 text-[10px] font-medium text-[var(--text-muted)]">
              {WEEKDAYS[day]}
            </div>
            {row.map((count, hour) => {
              const pct = count === 0 ? 0 : 12 + 88 * (count / max);
              return (
                <div key={hour} className="flex-1 px-[1px] py-[1px]">
                  <div
                    className="h-4 w-full rounded-[3px] border border-[var(--border)] transition-colors"
                    style={{
                      background:
                        count === 0
                          ? "transparent"
                          : `color-mix(in srgb, var(--accent) ${pct}%, transparent)`,
                    }}
                    title={`${WEEKDAYS[day]} ${String(hour).padStart(2, "0")}:00 — ${count} turns`}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
