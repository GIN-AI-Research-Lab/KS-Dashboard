import type { Badge, BadgeCategory } from "@/lib/stats";
import { BADGE_CATEGORY_LABEL } from "@/lib/stats";

const ORDER: BadgeCategory[] = ["streak", "volume", "money", "efficiency", "tools", "time", "community", "fun"];

export function BadgeGrid({
  badges,
  earnedCount,
  totalCount,
}: {
  badges: Badge[];
  earnedCount: number;
  totalCount: number;
}) {
  const byCat = new Map<BadgeCategory, Badge[]>();
  for (const b of badges) {
    const arr = byCat.get(b.category) ?? byCat.set(b.category, []).get(b.category)!;
    arr.push(b);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-[var(--text-muted)]">
        Đã đạt <span className="font-semibold text-[var(--text-primary)]">{earnedCount}/{totalCount}</span> huy hiệu
      </div>
      {ORDER.filter((c) => byCat.has(c)).map((cat) => (
        <div key={cat}>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {BADGE_CATEGORY_LABEL[cat]}
          </div>
          <div className="flex flex-wrap gap-2">
            {byCat.get(cat)!.map((b) => (
              <div
                key={b.key}
                title={b.desc}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-all duration-150 ${
                  b.earned
                    ? "card-surface border-[var(--border)] shadow-[var(--shadow-xs)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]"
                    : "border-dashed border-[var(--border)] opacity-40"
                }`}
              >
                <span className="text-lg" aria-hidden>{b.icon}</span>
                <span className="font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
