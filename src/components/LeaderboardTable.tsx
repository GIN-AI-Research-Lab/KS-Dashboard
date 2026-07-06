"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatNumber, formatUsd, formatDuration } from "@/lib/format";
import { UserChip } from "@/components/UserChip";
import { useT } from "@/i18n/I18nProvider";
import type { Translate } from "@/i18n/lookup";

const MEDALS = ["🥇", "🥈", "🥉"];

// Caller picks a format by name (server components can't pass a function into a
// client component across the RSC boundary).
const FORMATTERS = { number: formatNumber, usd: formatUsd, duration: formatDuration } as const;

type Row = {
  userId: string;
  userName: string;
  image?: string | null;
  team: string | null;
  department: string | null;
  value: number;
  rankDelta?: number | null;
};
type SortKey = "rank" | "name" | "value";

function SortIndicator({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return null;
  return dir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />;
}

// Rank change vs the previous period: ▲ up, ▼ down, – no change, "new" = new.
function MovementChip({ delta, t }: { delta?: number | null; t: Translate }) {
  if (delta === undefined) return null;
  if (delta === null)
    return <span className="rounded bg-accent/10 px-1 py-0.5 text-[10px] font-medium text-accent">{t("table.rankNew")}</span>;
  if (delta === 0) return <span className="text-[10px] text-[var(--text-muted)]">–</span>;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums ${
        up ? "text-[#0ca30c]" : "text-[#e34948]"
      }`}
      title={`${t(up ? "table.rankUp" : "table.rankDown")} ${Math.abs(delta)} ${t("table.rankChangeSuffix")}`}
    >
      {up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(delta)}
    </span>
  );
}

export function LeaderboardTable({
  rows,
  valueLabel,
  valueFormat,
}: {
  rows: Row[];
  valueLabel: string;
  valueFormat: keyof typeof FORMATTERS;
}) {
  const t = useT();
  const fmt = FORMATTERS[valueFormat];
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "rank", dir: "asc" });

  // rows arrive already in rank order (value desc); pin that as the rank.
  const ranked = useMemo(() => rows.map((r, i) => ({ ...r, rank: i + 1 })), [rows]);
  const sorted = useMemo(() => {
    const copy = [...ranked];
    copy.sort((a, b) => {
      let c = 0;
      if (sort.key === "name") c = a.userName.localeCompare(b.userName);
      else if (sort.key === "value") c = a.value - b.value;
      else c = a.rank - b.rank;
      return sort.dir === "asc" ? c : -c;
    });
    return copy;
  }, [ranked, sort]);

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">{t("table.noData")}</p>;
  }

  function toggle(key: SortKey, defaultDir: "asc" | "desc") {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: defaultDir }));
  }

  const thBtn =
    "inline-flex items-center gap-1 transition-colors hover:text-[var(--text-secondary)]";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--surface)]">
          <tr className="border-b border-[var(--gridline)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <th className="w-10 py-2 font-medium">
              <button type="button" className={thBtn} onClick={() => toggle("rank", "asc")}>
                # <SortIndicator active={sort.key === "rank"} dir={sort.dir} />
              </button>
            </th>
            <th className="py-2 pr-3 font-medium">
              <button type="button" className={thBtn} onClick={() => toggle("name", "asc")}>
                {t("table.employee")} <SortIndicator active={sort.key === "name"} dir={sort.dir} />
              </button>
            </th>
            <th className="py-2 pr-3 font-medium">{t("table.deptTeam")}</th>
            <th className="py-2 pr-0 text-right font-medium">
              <button type="button" className={`${thBtn} justify-end`} onClick={() => toggle("value", "desc")}>
                {valueLabel} <SortIndicator active={sort.key === "value"} dir={sort.dir} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.userId}
              className="border-b border-[var(--gridline)] transition-colors last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
            >
              <td className="py-2.5 text-base">{MEDALS[row.rank - 1] ?? row.rank}</td>
              <td className="py-2.5 pr-3 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <UserChip userId={row.userId} name={row.userName} image={row.image} />
                  <MovementChip delta={row.rankDelta} t={t} />
                </span>
              </td>
              <td className="py-2.5 pr-3 text-xs text-[var(--text-muted)]">
                {[row.department, row.team].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="py-2.5 pr-0 text-right font-semibold tabular-nums">{fmt(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
