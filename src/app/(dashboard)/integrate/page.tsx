import { stat } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { ExportLink } from "@/components/ExportLink";
import { ApiKeyBox } from "@/components/ApiKeyBox";

async function fileExists(rel: string): Promise<boolean> {
  try {
    await stat(path.join(process.cwd(), rel));
    return true;
  } catch {
    return false;
  }
}

export default async function IntegratePage() {
  const session = await auth();
  const [user, hasExe, hasMsi] = await Promise.all([
    prisma.user.findUnique({ where: { id: session!.user.id }, select: { apiKey: true } }),
    fileExists("deploy/ks-widget-setup.exe"),
    fileExists("deploy/ks-widget-setup.msi"),
  ]);
  const installer = hasExe
    ? { file: "ks-widget-setup.exe", label: "Tải bộ cài (.exe)" }
    : hasMsi
      ? { file: "ks-widget-setup.msi", label: "Tải bộ cài (.msi)" }
      : null;

  return (
    <div className="stagger mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="hero-panel relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-xs)]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-secondary)]">
            <span className="gradient-brand h-1.5 w-1.5 rounded-full" />
            TÍCH HỢP
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tích hợp <span className="gradient-text">Claude Code</span></h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Kết nối Claude Code (CLI + VS Code extension) để tự động gửi dữ liệu sử dụng lên dashboard
          </p>
        </div>
      </div>

      <Card title="Cài đặt cho cá nhân (không cần admin)">
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>Tải script và lưu vào máy:
            <div className="mt-1"><ExportLink href="/api/download/setup-telemetry.ps1" label="Tải setup-telemetry.ps1" /></div>
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

      <Card title="Lưu ý quan trọng">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-[var(--text-secondary)]">
          <li><b>Đổi endpoint khi địa chỉ dashboard thay đổi</b>: sửa biến <code className="font-mono">$ENDPOINT</code> đầu file <code className="font-mono">.ps1</code> rồi phát lại cho mọi người chạy lại.</li>
          <li>Endpoint phải là địa chỉ mà <b>máy nhân viên truy cập được</b> (cùng LAN, hoặc URL công khai qua tunnel/domain).</li>
          <li>Dashboard gán dữ liệu theo <b>email tài khoản Claude</b> (khớp phần trước dấu <code className="font-mono">@</code>). Bạn cần đã có tài khoản trong hệ thống.</li>
        </ul>
      </Card>

      <Card title="Widget desktop (tuỳ chọn)">
        <p className="text-sm text-[var(--text-secondary)]">
          Xem nhanh số liệu Claude Code của <b>riêng bạn</b> ngay trên desktop: ẩn dưới khay hệ thống,
          bấm để bật lên cạnh taskbar, hoặc ghim nổi luôn trên màn hình.
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Widget <b>chạy độc lập</b> — đọc trực tiếp dữ liệu Claude Code trên chính máy này
          (<code className="font-mono">~/.claude/projects</code>), chỉ đo <b>hôm nay</b> và tự reset lúc
          nửa đêm. Không cần kết nối dashboard, không cần API key.
        </p>

        {installer ? (
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm">
            <li>Tải và chạy bộ cài:
              <div className="mt-1"><ExportLink href={`/api/download/${installer.file}`} label={installer.label} /></div>
            </li>
            <li>Mở widget bất kỳ lúc nào từ <b>khay hệ thống</b> (góc phải taskbar) — nó tự hiển thị số liệu hôm nay của bạn.</li>
          </ol>
        ) : (
          <p className="mt-3 rounded-lg border border-[var(--border)] bg-black/[0.03] p-3 text-xs text-[var(--text-muted)] dark:bg-white/5">
            Chưa có bản cài sẵn. Admin build từ mã nguồn thư mục <code className="font-mono">widget/</code> bằng{" "}
            <code className="font-mono">npm run tauri build</code>, rồi đặt file cài vào{" "}
            <code className="font-mono">deploy/ks-widget-setup.exe</code> — nút tải sẽ tự xuất hiện ở đây.
          </p>
        )}

      </Card>

      <Card title="API key cá nhân">
        <p className="text-sm text-[var(--text-secondary)]">
          Dùng cho các tích hợp xác thực bằng <code className="font-mono">Bearer</code> (ví dụ plugin ghi dữ liệu).
          Cách cài telemetry ở trên <b>không</b> cần key này, và widget desktop cũng không cần.
        </p>
        <div className="mt-3">
          {user?.apiKey ? (
            <ApiKeyBox initialKey={user.apiKey} />
          ) : (
            <p className="text-xs text-[var(--text-muted)]">Không lấy được API key. Thử tải lại trang.</p>
          )}
        </div>
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
