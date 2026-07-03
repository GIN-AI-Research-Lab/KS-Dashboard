# Bật đăng nhập Microsoft (Entra ID) cho @kstns.biz

Code đã sẵn sàng — chỉ cần cấu hình **Azure Entra ID** + **env**, rồi khởi động lại. Nút
"Đăng nhập bằng Microsoft" tự hiện ở trang login khi provider được bật.

## A. Đăng ký app trong Microsoft Entra ID (Azure Portal)

Làm trong **tenant sở hữu domain kstns.biz** (là tenant Microsoft 365 của công ty).

1. **Microsoft Entra ID → App registrations → New registration**.
2. **Name**: `KS Dashboard`.
3. **Supported account types**:
   - Nếu `kstns.biz` **và** `sint.co.jp` cùng nằm trong **một tenant** → chọn *"Accounts in this organizational directory only"* (single-tenant, đơn giản & an toàn nhất).
   - Nếu hai domain ở **hai tenant khác nhau** → chọn *"Accounts in any organizational directory"* (multi-tenant).
4. **Redirect URI**: platform **Web**, giá trị:
   `https://<DOMAIN-APP>/api/auth/callback/microsoft-entra-id`
   > ⚠️ Entra **chỉ chấp nhận HTTPS** (trừ `http://localhost`). Xem mục C.
5. **Register** → copy **Application (client) ID** và **Directory (tenant) ID**.
6. **Certificates & secrets → New client secret** → copy **Value** (không phải Secret ID).
7. **API permissions**: mặc định (Microsoft Graph: `openid`, `profile`, `email`, `User.Read`) là đủ. Bấm *Grant admin consent* nếu tổ chức yêu cầu.

## B. Cấu hình app (`.env`) rồi khởi động lại

```env
AUTH_MICROSOFT_ENTRA_ID_ID="<Application (client) ID>"
AUTH_MICROSOFT_ENTRA_ID_SECRET="<Client secret VALUE>"
AUTH_MICROSOFT_ENTRA_ID_ISSUER="https://login.microsoftonline.com/<Directory (tenant) ID>/v2.0"
AUTH_URL="https://<DOMAIN-APP>"          # phải khớp host của Redirect URI, HTTPS
ALLOWED_EMAIL_DOMAINS="sint.co.jp,kstns.biz"   # đã set sẵn
```

- Khởi động lại app (env chỉ đọc lúc khởi động). Nút Microsoft sẽ tự xuất hiện.
- Multi-tenant: vẫn set `ISSUER` theo tenant chính; nếu cần nhận mọi tenant, dùng `.../organizations/v2.0` và app phải là multi-tenant.

## C. ⚠️ Bắt buộc HTTPS (điểm hay vướng nhất)

Redirect URI của Entra **phải là HTTPS**, ngoại trừ `http://localhost`. Hiện app đang chạy HTTP qua
`nip.io` (LAN) → **SSO sẽ không dùng được** ngoài localhost. Chọn 1:

- **Test nhanh tại máy**: truy cập `http://localhost:4000`, Redirect URI = `http://localhost:4000/api/auth/callback/microsoft-entra-id`, `AUTH_URL="http://localhost:4000"`.
- **Dùng thật cho công ty**: phục vụ qua **HTTPS** — domain thật + chứng chỉ (reverse proxy Caddy/nginx + Let's Encrypt), hoặc **Cloudflare Tunnel** (cho URL `https://...`). Set `AUTH_URL` + Redirect URI theo URL HTTPS đó.

## D. Nhân viên phải có sẵn tài khoản trong hệ thống

signIn callback khớp người đăng nhập theo **phần trước dấu `@`** (không phân biệt hoa/thường). Ví dụ
`tuent@kstns.biz` chỉ vào được nếu đã có User với `emailLocalPart = "tuent"`. Tạo user trước qua
**trang Quản trị** hoặc **đồng bộ AMIS** (`npm run sync:amis`). *Không tự tạo tài khoản khi SSO lần đầu*
(theo thiết kế) — nếu muốn tự tạo, xem mục E.

Nhờ khớp theo local-part: `tuent@kstns.biz` và `tuent@sint.co.jp` vào **cùng một tài khoản**.

## E. (Tuỳ chọn) Tự tạo tài khoản khi SSO lần đầu

Nếu muốn ai có email @kstns.biz hợp lệ là tự tạo user luôn (khỏi tạo trước), sửa `signIn`/`jwt`
callback trong [`src/auth.ts`](../src/auth.ts) để `upsert` user khi chưa tồn tại. Nói với dev để bật.

## Lỗi thường gặp (đã có thông báo tiếng Việt ở trang login)
- **DomainNotAllowed**: email không thuộc `ALLOWED_EMAIL_DOMAINS`.
- **UnknownEmployee**: chưa có user khớp local-part (mục D).
- **redirect_uri_mismatch** (từ Microsoft): Redirect URI trong Azure không khớp `AUTH_URL` / không phải HTTPS (mục C).
