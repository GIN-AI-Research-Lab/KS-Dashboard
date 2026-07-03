import { Card } from "@/components/ui/Card";
import { ExportLink } from "@/components/ExportLink";

export default function IntegratePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Tích hợp Claude Code</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Kết nối Claude Code (CLI + VS Code extension) để tự động gửi dữ liệu sử dụng lên dashboard
        </p>
      </div>

      <Card title="Cách 1 — Cá nhân (tự cài, không cần admin)">
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>Tải script và lưu vào máy:
            <div className="mt-1"><ExportLink href="/api/download/setup-telemetry.ps1" label="⭳ Tải setup-telemetry.ps1" /></div>
          </li>
          <li>Mở PowerShell tại thư mục chứa file, chạy:
            <pre className="mt-1 overflow-x-auto rounded-lg bg-black/[0.04] p-2 font-mono text-xs dark:bg-white/5">powershell -ExecutionPolicy Bypass -File setup-telemetry.ps1</pre>
          </li>
          <li><b>Thoát hẳn</b> VS Code / Claude Code (không chỉ Reload Window) rồi mở lại — biến telemetry chỉ đọc lúc khởi động.</li>
          <li>Chat vài câu, rồi mở trang <b>Phiên trực tuyến</b> (/live) — phiên của bạn sẽ xuất hiện sau ~30–60s.</li>
        </ol>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Script ghi biến OTel vào <code className="font-mono">~/.claude/settings.json</code> (áp cho mọi project trên máy).
        </p>
      </Card>

      <Card title="Cách 2 — IT triển khai toàn công ty (cần admin)">
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>Tải script (self-elevate admin, áp cho <b>CLI + VS Code + WSL</b> trên máy):
            <div className="mt-1"><ExportLink href="/api/download/install-managed-settings.ps1" label="⭳ Tải install-managed-settings.ps1" /></div>
          </li>
          <li>Chạy (chuột phải → Run with PowerShell, hoặc):
            <pre className="mt-1 overflow-x-auto rounded-lg bg-black/[0.04] p-2 font-mono text-xs dark:bg-white/5">powershell -ExecutionPolicy Bypass -File install-managed-settings.ps1</pre>
          </li>
          <li>Đẩy hàng loạt (GPO/Intune): chạy <code className="font-mono">-DumpJson</code> để sinh <code className="font-mono">managed-settings.json</code> rồi đẩy tới <code className="font-mono">C:\Program Files\ClaudeCode\</code> cho mọi máy.</li>
          <li>Người dùng thoát hẳn &amp; mở lại Claude Code / VS Code.</li>
        </ol>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Cách này người dùng <b>không thể tắt</b> và không để lại file lạ trong project.
        </p>
      </Card>

      <Card title="Lưu ý quan trọng">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-[var(--text-secondary)]">
          <li><b>Đổi endpoint khi địa chỉ dashboard thay đổi</b>: sửa biến <code className="font-mono">$ENDPOINT</code> đầu file <code className="font-mono">.ps1</code> rồi phát lại cho mọi người chạy lại.</li>
          <li>Endpoint phải là địa chỉ mà <b>máy nhân viên truy cập được</b> (cùng LAN, hoặc URL công khai qua tunnel/domain).</li>
          <li>Dashboard gán dữ liệu theo <b>email tài khoản Claude</b> (khớp phần trước dấu <code className="font-mono">@</code>). Bạn cần đã có tài khoản trong hệ thống.</li>
        </ul>
      </Card>

      <Card title="Kiểm tra">
        <p className="text-sm text-[var(--text-secondary)]">
          Sau khi cài và khởi động lại, chat vài câu trong Claude Code rồi vào trang{" "}
          <b>Phiên trực tuyến</b> (/live) hoặc <b>Cá nhân</b> (/me) — dữ liệu của bạn sẽ hiện ra.
        </p>
      </Card>
    </div>
  );
}
