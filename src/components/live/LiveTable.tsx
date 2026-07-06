"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatNumber, formatUsd, formatRelativeTime } from "@/lib/format";
import { UserChip } from "@/components/UserChip";
import { useT } from "@/i18n/I18nProvider";

export type LiveRow = {
  id: string;
  userId: string;
  userName: string;
  image?: string | null;
  department: string | null;
  projectLabel: string | null;
  model: string | null;
  status: "ACTIVE" | "IDLE" | "ENDED";
  startedAt: string; // ISO
  lastEventAt: string; // ISO
  costUsd: number;
  turnCount: number;
  toolCallCount: number;
};

type SortKey = "user" | "department" | "project" | "model" | "status" | "turns" | "tools" | "cost" | "activity";

const STATUS_RANK: Record<LiveRow["status"], number> = { ACTIVE: 0, IDLE: 1, ENDED: 2 };

function SortIndicator({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return null;
  return dir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />;
}

export function LiveTable({ rows }: { rows: LiveRow[] }) {
  const t = useT();
  const router = useRouter();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "activity", dir: "desc" });

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let c = 0;
      switch (sort.key) {
        case "user":
          c = a.userName.localeCompare(b.userName);
          break;
        case "department":
          c = (a.department ?? "").localeCompare(b.department ?? "");
          break;
        case "project":
          c = (a.projectLabel ?? "").localeCompare(b.projectLabel ?? "");
          break;
        case "model":
          c = (a.model ?? "").localeCompare(b.model ?? "");
          break;
        case "status":
          c = STATUS_RANK[a.status] - STATUS_RANK[b.status];
          break;
        case "turns":
          c = a.turnCount - b.turnCount;
          break;
        case "tools":
          c = a.toolCallCount - b.toolCallCount;
          break;
        case "cost":
          c = a.costUsd - b.costUsd;
          break;
        default:
          c = new Date(a.lastEventAt).getTime() - new Date(b.lastEventAt).getTime();
      }
      return sort.dir === "asc" ? c : -c;
    });
    return copy;
  }, [rows, sort]);

  function toggle(key: SortKey, defaultDir: "asc" | "desc") {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: defaultDir }));
  }

  if (rows.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">{t("live.empty")}</p>;
  }

  const thBtn = "inline-flex items-center gap-1 transition-colors hover:text-[var(--text-secondary)]";
  const statusMeta: Record<LiveRow["status"], { variant: "good" | "warning" | "neutral"; key: string }> = {
    ACTIVE: { variant: "good", key: "live.running" },
    IDLE: { variant: "warning", key: "live.idle" },
    ENDED: { variant: "neutral", key: "live.ended" },
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--surface)]">
          <tr className="border-b border-[var(--gridline)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <th className="py-2 pr-3 font-medium">
              <button type="button" className={thBtn} onClick={() => toggle("user", "asc")}>
                {t("live.colUser")} <SortIndicator active={sort.key === "user"} dir={sort.dir} />
              </button>
            </th>
            <th className="py-2 pr-3 font-medium">
              <button type="button" className={thBtn} onClick={() => toggle("department", "asc")}>
                {t("live.colDepartment")} <SortIndicator active={sort.key === "department"} dir={sort.dir} />
              </button>
            </th>
            <th className="py-2 pr-3 font-medium">
              <button type="button" className={thBtn} onClick={() => toggle("project", "asc")}>
                {t("live.colProject")} <SortIndicator active={sort.key === "project"} dir={sort.dir} />
              </button>
            </th>
            <th className="py-2 pr-3 font-medium">
              <button type="button" className={thBtn} onClick={() => toggle("status", "asc")}>
                {t("live.colStatus")} <SortIndicator active={sort.key === "status"} dir={sort.dir} />
              </button>
            </th>
            <th className="py-2 pr-3 text-right font-medium">
              <button type="button" className={`${thBtn} justify-end`} onClick={() => toggle("turns", "desc")}>
                {t("live.colTurns")} <SortIndicator active={sort.key === "turns"} dir={sort.dir} />
              </button>
            </th>
            <th className="py-2 pr-3 text-right font-medium">
              <button type="button" className={`${thBtn} justify-end`} onClick={() => toggle("tools", "desc")}>
                {t("live.colTools")} <SortIndicator active={sort.key === "tools"} dir={sort.dir} />
              </button>
            </th>
            <th className="py-2 pr-3 text-right font-medium">
              <button type="button" className={`${thBtn} justify-end`} onClick={() => toggle("cost", "desc")}>
                {t("live.colCost")} <SortIndicator active={sort.key === "cost"} dir={sort.dir} />
              </button>
            </th>
            <th className="py-2 pr-0 text-right font-medium">
              <button type="button" className={`${thBtn} justify-end`} onClick={() => toggle("activity", "desc")}>
                {t("live.colActivity")} <SortIndicator active={sort.key === "activity"} dir={sort.dir} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const meta = statusMeta[row.status];
            return (
              <tr
                key={row.id}
                onClick={() => router.push(`/live/${row.id}`)}
                className="cursor-pointer border-b border-[var(--gridline)] transition-colors last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <td className="py-2.5 pr-3 font-medium">
                  <UserChip userId={row.userId} name={row.userName} image={row.image} />
                </td>
                <td className="py-2.5 pr-3 text-xs text-[var(--text-muted)]">
                  {row.department || "—"}
                </td>
                <td className="py-2.5 pr-3 text-[var(--text-secondary)]">{row.projectLabel ?? "—"}</td>
                <td className="py-2.5 pr-3">
                  <Badge variant={meta.variant}>{t(meta.key)}</Badge>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{formatNumber(row.turnCount)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{formatNumber(row.toolCallCount)}</td>
                <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{formatUsd(row.costUsd)}</td>
                <td className="py-2.5 pr-0 text-right text-xs text-[var(--text-muted)]">
                  {formatRelativeTime(row.lastEventAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
