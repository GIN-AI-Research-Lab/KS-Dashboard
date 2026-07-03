// Server-rendered heatmap: rows = weekday (Mon..Sun), columns = hour (0..23).
// Intensity is encoded with opacity over the brand blue, which reads correctly
// in both light and dark themes without a per-theme palette.

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const BLUE = "42, 120, 214"; // #2a78d6 as rgb channels

export function ActivityHeatmap({ grid, max }: { grid: number[][]; max: number }) {
  if (max === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-[var(--text-muted)]">
        Chưa có dữ liệu trong khoảng thời gian này
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
              const alpha = count === 0 ? 0 : 0.12 + 0.88 * (count / max);
              return (
                <div key={hour} className="flex-1 px-[1px] py-[1px]">
                  <div
                    className="h-4 w-full rounded-[3px] border border-[var(--border)]"
                    style={{ background: count === 0 ? "transparent" : `rgba(${BLUE}, ${alpha})` }}
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
