"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatNumber, formatUsd } from "@/lib/format";
import { InfoTip } from "@/components/ui/InfoTip";
import { getMetricHelp } from "@/lib/glossary";
import { UserChip } from "@/components/UserChip";
import { useT } from "@/i18n/I18nProvider";

type Member = {
  userId: string;
  userName: string;
  image?: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  turnCount: number;
};
type SortKey = "userName" | "inputTokens" | "outputTokens" | "turnCount" | "costUsd";

function SortIndicator({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return null;
  return dir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />;
}

export function MemberTable({ members }: { members: Member[] }) {
  const t = useT();
  const METRIC_HELP = getMetricHelp(t);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "costUsd", dir: "desc" });

  const sorted = useMemo(() => {
    const copy = [...members];
    copy.sort((a, b) => {
      const c =
        sort.key === "userName"
          ? a.userName.localeCompare(b.userName)
          : (a[sort.key] as number) - (b[sort.key] as number);
      return sort.dir === "asc" ? c : -c;
    });
    return copy;
  }, [members, sort]);

  if (members.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">{t("table.noMembers")}</p>;
  }

  function toggle(key: SortKey, defaultDir: "asc" | "desc") {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: defaultDir }));
  }

  const thBtn = "inline-flex items-center gap-1 transition-colors hover:text-[var(--text-secondary)]";

  const numCols: { key: SortKey; label: string; tip?: string }[] = [
    { key: "inputTokens", label: t("table.input"), tip: METRIC_HELP.inputTokens },
    { key: "outputTokens", label: t("table.output"), tip: METRIC_HELP.outputTokens },
    { key: "turnCount", label: t("table.turns"), tip: METRIC_HELP.turns },
    { key: "costUsd", label: t("table.cost") },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--surface)]">
          <tr className="border-b border-[var(--gridline)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <th className="py-2 pr-3 font-medium">
              <button type="button" className={thBtn} onClick={() => toggle("userName", "asc")}>
                {t("table.member")} <SortIndicator active={sort.key === "userName"} dir={sort.dir} />
              </button>
            </th>
            {numCols.map((c) => (
              <th key={c.key} className="py-2 pr-3 text-right font-medium last:pr-0">
                <span className="inline-flex items-center justify-end gap-1">
                  <button type="button" className={`${thBtn} justify-end`} onClick={() => toggle(c.key, "desc")}>
                    {c.label} <SortIndicator active={sort.key === c.key} dir={sort.dir} />
                  </button>
                  {c.tip && <InfoTip label={c.tip} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr
              key={m.userId}
              className="border-b border-[var(--gridline)] transition-colors last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
            >
              <td className="py-2 pr-3 font-medium">
                <UserChip userId={m.userId} name={m.userName} image={m.image} />
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(m.inputTokens)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatNumber(m.outputTokens)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{m.turnCount}</td>
              <td className="py-2 pr-0 text-right tabular-nums">{formatUsd(m.costUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
