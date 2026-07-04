import Link from "next/link";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardTable({
  rows,
  valueLabel,
  valueFormatter,
}: {
  rows: { userId: string; userName: string; team: string | null; department: string | null; value: number }[];
  valueLabel: string;
  valueFormatter: (n: number) => string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Chưa có dữ liệu trong khoảng thời gian này</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--gridline)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <th className="w-10 py-2 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">Nhân viên</th>
            <th className="py-2 pr-3 font-medium">Bộ phận / Nhóm</th>
            <th className="py-2 pr-0 text-right font-medium">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.userId} className="border-b border-[var(--gridline)] last:border-0 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
              <td className="py-2.5 text-base">{MEDALS[i] ?? i + 1}</td>
              <td className="py-2.5 pr-3 font-medium">
                <Link href={`/users/${row.userId}`} className="transition-colors hover:text-accent">
                  {row.userName}
                </Link>
              </td>
              <td className="py-2.5 pr-3 text-xs text-[var(--text-muted)]">
                {[row.department, row.team].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="py-2.5 pr-0 text-right font-semibold tabular-nums">{valueFormatter(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
