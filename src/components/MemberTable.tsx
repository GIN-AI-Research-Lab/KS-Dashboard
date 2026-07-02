import Link from "next/link";
import { formatNumber, formatUsd } from "@/lib/format";

export function MemberTable({
  members,
}: {
  members: { userId: string; userName: string; inputTokens: number; outputTokens: number; costUsd: number; turnCount: number }[];
}) {
  if (members.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Chưa có thành viên</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--gridline)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <th className="py-2 pr-3 font-medium">Thành viên</th>
            <th className="py-2 pr-3 text-right font-medium">Input</th>
            <th className="py-2 pr-3 text-right font-medium">Output</th>
            <th className="py-2 pr-3 text-right font-medium">Turns</th>
            <th className="py-2 pr-0 text-right font-medium">Chi phí</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.userId} className="border-b border-[var(--gridline)] last:border-0">
              <td className="py-2 pr-3 font-medium">
                <Link href={`/users/${m.userId}`} className="hover:text-[#2a78d6]">
                  {m.userName}
                </Link>
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
