# Triển khai telemetry cho cả công ty (managed settings)

Đây là cách bật OTel telemetry cho **toàn bộ** Claude Code trên một máy — **CLI, VS Code extension, và WSL** —
mà **không** để lại `.claude/` hay `settings.json` trong project của người dùng, và người dùng **không thể tắt**.

Cơ chế: Claude Code đọc một file **managed settings** ở vị trí hệ thống (tầng chính sách, ưu tiên cao nhất).
File này do IT/admin đặt một lần trên mỗi máy — nó nằm ngoài mọi project và ngoài `~/.claude`, nên không bao
giờ xuất hiện trong cửa sổ làm việc của nhân viên. Nội dung dùng đúng schema settings.json thông thường
(ở đây chỉ chứa khối `env` cho OTel + cờ kế thừa WSL).

Nội dung file được nhúng sẵn trong [`install-managed-settings.ps1`](./install-managed-settings.ps1)
(biến `$json`, nguồn sự thật duy nhất). **Đổi `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`** (biến `$ENDPOINT`
trong script) cho khớp URL dashboard thật (hiện đang trỏ nip.io LAN để test).

## Đặt file ở đâu (cần quyền admin)

| Nền tảng | Đường dẫn |
|----------|-----------|
| **Windows** (native + gốc cho WSL kế thừa) | `C:\Program Files\ClaudeCode\managed-settings.json` |
| **Linux / WSL** (nếu không dùng kế thừa từ Windows) | `/etc/claude-code/managed-settings.json` |
| **macOS** | `/Library/Application Support/ClaudeCode/managed-settings.json` |

> Ngoài file, Windows còn hỗ trợ chính sách qua registry `HKLM\SOFTWARE\Policies\ClaudeCode` (dùng khi đẩy
> bằng Group Policy). File JSON ở trên là cách đơn giản nhất.

## WSL: chỉ cần 1 file trên Windows

File Windows ở trên đã có `"wslInheritsWindowsSettings": true`. Với cờ này, Claude Code chạy trong **WSL**
sẽ đọc luôn chuỗi chính sách Windows (gồm `C:\Program Files\ClaudeCode\managed-settings.json` qua DrvFs)
**cộng thêm** `/etc/claude-code`. Windows được ưu tiên. → Đặt 1 file trên Windows là phủ cả native Windows
lẫn WSL, không phải cấu hình trong từng distro WSL.

(Nếu có máy Linux thuần / WSL không muốn phụ thuộc Windows: chép file này vào `/etc/claude-code/managed-settings.json`.)

## Cách đẩy hàng loạt (chọn 1)

Với GPO/Intune/imaging bạn cần file `managed-settings.json` thô. Sinh ra nó bằng chế độ `-DumpJson`
của script (không cần admin, không cài gì — chỉ ghi file cạnh script):

```powershell
powershell -ExecutionPolicy Bypass -File .\install-managed-settings.ps1 -DumpJson
```

Sau đó chọn 1 cách đẩy:

- **Thủ công / script khởi tạo máy**: copy `managed-settings.json` vừa sinh vào đường dẫn tương ứng (cần admin).
- **Group Policy (GPO)** hoặc **Intune/MDM**: đẩy file tới `C:\Program Files\ClaudeCode\` cho mọi máy domain.
- **Ghost/image máy**: nhúng sẵn file vào image.

Hoặc cài trực tiếp trên từng máy (tự elevate admin, tự ghi vào `C:\Program Files\ClaudeCode\`):

```powershell
powershell -ExecutionPolicy Bypass -File .\install-managed-settings.ps1
```

## Sau khi đặt file

Người dùng **thoát hẳn và mở lại** Claude Code / VS Code (biến env OTel chỉ đọc lúc khởi động). Từ đó mọi
phiên tự gửi telemetry về dashboard — không cài plugin, không `/plugin configure`, không file lạ trong project.

## Kiểm tra

Người dùng chat vài câu, rồi vào dashboard (`/live` hoặc trang thống kê) xem phiên của họ có xuất hiện,
gán đúng tài khoản (khớp theo local-part email Claude Code) không.
