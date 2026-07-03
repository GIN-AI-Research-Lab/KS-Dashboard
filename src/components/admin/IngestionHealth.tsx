import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { formatNumber, formatRelativeTime } from "@/lib/format";

type Summary = {
  totalUsers: number;
  reporting: number;
  silent: number;
  activeSessions: number;
  lastEventAt: string | null;
  errorCount: number;
};

type Row = {
  userId: string;
  name: string;
  email: string;
  lastEventAt: string | null;
  sessionCount: number;
  turnCount: number;
  noData: boolean;
  silent: boolean;
};

export function IngestionHealth({ summary, rows }: { summary: Summary; rows: Row[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Đang gửi dữ liệu" value={`${summary.reporting}/${summary.totalUsers}`} accent="#0ca30c" icon="✓" />
        <StatCard label="Im lặng >7 ngày" value={formatNumber(summary.silent)} accent="#e34948" icon="!" />
        <StatCard label="Phiên đang mở" value={formatNumber(summary.activeSessions)} accent="#2a78d6" icon="●" />
        <StatCard label="Tool lỗi (tất cả)" value={formatNumber(summary.errorCount)} accent="#eb6834" icon="✕" />
        <StatCard
          label="Sự kiện gần nhất"
          value={summary.lastEventAt ? formatRelativeTime(summary.lastEventAt) : "—"}
          accent="#4a3aa7"
          icon="◷"
        />
      </div>

      <Card title="Tình trạng theo nhân viên">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-2 pr-4 font-medium">Nhân viên</th>
                <th className="py-2 pr-4 text-right font-medium">Phiên</th>
                <th className="py-2 pr-4 text-right font-medium">Turns</th>
                <th className="py-2 pr-4 font-medium">Sự kiện gần nhất</th>
                <th className="py-2 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((rowItem) => (
                <tr key={rowItem.userId} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{rowItem.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{rowItem.email}</div>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(rowItem.sessionCount)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(rowItem.turnCount)}</td>
                  <td className="py-2 pr-4 text-[var(--text-secondary)]">
                    {rowItem.lastEventAt ? formatRelativeTime(rowItem.lastEventAt) : "—"}
                  </td>
                  <td className="py-2">
                    {rowItem.noData ? (
                      <Badge variant="neutral">Chưa có dữ liệu</Badge>
                    ) : rowItem.silent ? (
                      <Badge variant="critical">Im lặng</Badge>
                    ) : (
                      <Badge variant="good">Hoạt động</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-sm text-[var(--text-muted)]">
                    Chưa có nhân viên nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
