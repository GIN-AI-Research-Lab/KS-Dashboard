"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatNumber, formatUsd, formatDuration } from "@/lib/format";

const MEDALS = ["🥇", "🥈", "🥉"];

// Caller picks a format by name (server components can't pass a function into a
// client component across the RSC boundary).
const FORMATTERS = { number: formatNumber, usd: formatUsd, duration: formatDuration } as const;

type Row = {
  userId: string;
  userName: string;
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

// Rank change vs the previous period: ▲ up, ▼ down, – no change, "mới" = new.
function MovementChip({ delta }: { delta?: number | null }) {
  if (delta === undefined) return null;
  if (delta === null)
    return <span className="rounded bg-accent/10 px-1 py-0.5 text-[10px] font-medium text-accent">mới</span>;
  if (delta === 0) return <span className="text-[10px] text-[var(--text-muted)]">–</span>;
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums ${
        up ? "text-[#0ca30c]" : "text-[#e34948]"
      }`}
      title={`${up ? "Tăng" : "Giảm"} ${Math.abs(delta)} hạng so với kỳ trước`}
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
    return <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu trong khoảng thời gian này</p>;
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
                Nhân viên <SortIndicator active={sort.key === "name"} dir={sort.dir} />
              </button>
            </th>
            <th className="py-2 pr-3 font-medium">Bộ phận / Nhóm</th>
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
                  <Link href={`/users/${row.userId}`} className="transition-colors hover:text-accent">
                    {row.userName}
                  </Link>
                  <MovementChip delta={row.rankDelta} />
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
