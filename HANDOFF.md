# KS Dashboard — Handoff / Tiếp tục xử lý

Tài liệu này ghi lại trạng thái hiện tại và các bước còn dang dở để tiếp tục trên máy khác.

## Trạng thái tổng quan

Dashboard cơ bản (Next.js 16 + Prisma/SQLite + NextAuth v5 + Recharts) đã hoạt động đầy đủ và đã test
thật với Claude Code plugin (xác nhận đúng token/chi phí/tool call). Đang giữa chừng thêm:
tích hợp MISA AMIS (đồng bộ user/phòng ban) + đăng nhập SSO Microsoft Entra ID đa domain +
đổi cơ chế xác thực plugin sang "token chung công ty + tự nhận diện", theo yêu cầu của user.

**Đăng nhập hiện tại:** `admin@company.com` / `admin1234` — DB chỉ có 1 user (admin), không còn dữ liệu giả.

## Việc đã xong (đã test/verify thật)

- Next.js 16 app đầy đủ trang: Tổng quan, Cá nhân, Nhóm/Bộ phận, Xếp hạng, Model, Live (SSE),
  Quản trị (CRUD user/team/department). Route `middleware.ts` → `proxy.ts` (Next 16 rename).
- Prisma schema: Department/Team/User/ClaudeSession/Turn/ToolCall. Pin Prisma `^6` (Prisma 7 đổi cấu hình
  datasource, không tương thích cách viết hiện tại).
- Claude Code plugin (`claude-code-plugin/`) — đã cài thật qua `claude plugin marketplace add` +
  `claude plugin install`, test bằng phiên Claude Code thật (`claude -p`), verify token/chi phí khớp
  chính xác với số Claude Code tự báo cáo. 3 lỗi đã tìm và sửa:
  1. `plugin.json` từng khai báo thừa `"hooks": "./hooks/hooks.json"` → lỗi "Duplicate hooks file" (đã xoá).
  2. Hook `Stop` **không chạy** khi test qua `claude -p` (chế độ 1 lệnh rồi thoát) → đã thêm fallback:
     `SessionEnd` cũng đọc transcript (idempotent nhờ `state.transcriptLine`), không mất token nữa.
  3. Chi phí tính thiếu vì luôn giả định cache 5 phút (1.25x) trong khi Claude Code hay dùng cache
     1 giờ (2x) → đã sửa đọc đúng `usage.cache_creation.ephemeral_1h_input_tokens` /
     `ephemeral_5m_input_tokens`, tính khớp chính xác.
  - **Xác nhận qua debug thật (an toàn, chỉ liệt kê TÊN biến môi trường, không đọc giá trị):**
    Claude Code **không** expose email tài khoản đăng nhập cho hook (không có env var/field nào chứa
    email trong hook input hay `process.env`). → Không thể tự động lấy email Claude account.
    Nhưng phát hiện hữu ích: `CLAUDE_PLUGIN_OPTION_API_ENDPOINT` / `CLAUDE_PLUGIN_OPTION_API_KEY`
    được set sẵn thành **env var** (không chỉ qua `${user_config.x}` trong command string) — có thể
    dùng thay vì truyền qua argv, gọn hơn (chưa áp dụng, xem TODO).
  - Marketplace cục bộ đã đăng ký trên máy này: `.claude-plugin/marketplace.json` ở gốc repo,
    trỏ tới `./claude-code-plugin`. Cài bằng:
    ```
    claude plugin marketplace add "F:\Project Ai\KS-Dashboard"
    claude plugin install ks-dashboard-telemetry@ks-dashboard-marketplace
    /plugin configure ks-dashboard-telemetry@ks-dashboard-marketplace   # trong chat Claude Code
    ```
    **Lưu ý:** mỗi lần sửa code trong `claude-code-plugin/`, phải tăng `version` trong
    `.claude-plugin/plugin.json` rồi chạy `claude plugin marketplace update ks-dashboard-marketplace`
    + `claude plugin update ks-dashboard-telemetry@ks-dashboard-marketplace` thì thay đổi mới
    được đồng bộ vào cache (`~/.claude/plugins/cache/...`) — sửa source không tự động áp dụng.
- Đã nghiên cứu MISA AMIS: **có** API thật lấy được tên/email/phòng ban nhân viên (server-to-server,
  Client ID + Secret lấy từ AMIS > Thiết lập > Quản trị dữ liệu > Kết nối ứng dụng). **Không tìm thấy**
  bằng chứng AMIS hỗ trợ làm SSO/IdP cho web bên thứ ba (MISA ID chỉ tiêu thụ SSO từ Google/Microsoft/…
  để đăng nhập vào chính AMIS, không ngược lại).
  Nguồn: https://helpamis.misa.vn/amis-thong-tin-nhan-su/kb/tich-hop-api/ ,
  https://helpamis.misa.vn/kb/dang-nhap-amis-platform-bang-tai-khoan-google-microsoft-apple/

## Quyết định kiến trúc đã chốt với user (đang code dở, xem TODO)

1. **Đăng nhập web:** dùng Microsoft Entra ID SSO (không dùng AMIS SSO vì AMIS không hỗ trợ chiều này).
   Công ty có 2 domain email: `sint.co.jp` và `kstns.biz` — có thể là 2 tenant M365 khác nhau nên dùng
   endpoint multi-tenant mặc định (`issuer` để trống → `common`), tự lọc domain trong callback `signIn`.
2. **Liên kết tài khoản đa domain:** khớp theo **local-part** (phần trước @), không quan tâm domain nào
   trong 2 domain cho phép. Ví dụ `tuent@sint.co.jp` và `tuent@kstns.biz` → cùng 1 User (do email AMIS
   đồng bộ có thể là `tuent@kstns.biz` nhưng user đăng nhập bằng `tuent@sint.co.jp`).
3. **Plugin không cần API key riêng từng người:** dùng 1 token chung cho cả công ty (IT cấp 1 lần,
   rollout hàng loạt) + plugin tự nhận diện theo **username Windows hiện tại** (vì Claude Code
   *không* expose email tài khoản cho hook — đã xác nhận ở trên) làm định danh, khớp theo local-part
   giống hệt cơ chế đăng nhập web.
4. **AMIS sync:** đồng bộ định kỳ/thủ công user + phòng ban từ AMIS vào DB, upsert theo
   `amisEmployeeCode` (đã thêm field), set `email`/`emailLocalPart`/`department`/`team`.

## Đã sửa trong DB/code (CHƯA COMMIT lúc dừng — file này sẽ commit cùng)

- `prisma/schema.prisma`: `User.passwordHash` → nullable (tài khoản chỉ đăng nhập SSO không có mật khẩu
  local); thêm `User.emailLocalPart String @unique` (dùng để khớp đa domain); thêm
  `User.amisEmployeeCode String? @unique` + `lastAmisSyncAt DateTime?` (khoá upsert khi sync AMIS).
- **Đã chạy `db push` thành công** — DB hiện tại đã có cột mới, admin đã backfill `emailLocalPart = "admin"`.
  Đã chạy lại `prisma generate` (phải kill node PID giữ lock file DLL trên Windows trước khi generate
  lại được — nếu gặp lỗi `EPERM ... rename query_engine-windows.dll.node.tmp...` thì tắt server dev
  đang chạy rồi `npx prisma generate` lại).
- `prisma/seed.ts`: đã thêm `emailLocalPart` khi tạo admin.
- `src/lib/identity.ts` (MỚI): helper `emailLocalPart()`, `isAllowedEmailDomain()`, `findUserByIdentity()`.
  Đọc domain cho phép từ env `ALLOWED_EMAIL_DOMAINS` (chưa thêm vào `.env`/`.env.example` — xem TODO).
- `src/auth.ts`: đã thêm provider `MicrosoftEntraID` (chỉ bật khi có
  `AUTH_MICROSOFT_ENTRA_ID_ID`/`AUTH_MICROSOFT_ENTRA_ID_SECRET` trong env — hiện CHƯA có nên provider
  này chưa active), callback `signIn` chặn domain lạ + email không khớp user có sẵn, callback `jwt`
  gán lại field theo user khớp được (không theo profile OAuth thô).

## TODO — việc còn lại, làm theo thứ tự này khi tiếp tục

1. **Chưa chạy được:** `npx tsc --noEmit` để xác nhận `auth.ts`/`identity.ts` không lỗi type (bị dừng
   giữa chừng theo yêu cầu user). **Việc đầu tiên cần làm khi resume.**
2. Thêm vào `.env` / `.env.example`:
   ```
   ALLOWED_EMAIL_DOMAINS="sint.co.jp,kstns.biz"
   AUTH_MICROSOFT_ENTRA_ID_ID=""
   AUTH_MICROSOFT_ENTRA_ID_SECRET=""
   AUTH_MICROSOFT_ENTRA_ID_ISSUER=""   # để trống nếu 2 domain khác tenant
   KS_DASHBOARD_INGEST_TOKEN=""        # token chung cho plugin — generate bằng randomBytes rồi điền
   ```
   Cần user cung cấp Client ID/Secret thật từ Azure/Entra admin (đăng ký App Registration, redirect URI:
   `<domain>/api/auth/callback/microsoft-entra-id`).
3. Thêm nút "Đăng nhập bằng Microsoft" ở `src/app/login/page.tsx` (dùng `signIn("microsoft-entra-id")`
   từ `next-auth/react`), chỉ hiện khi provider đã cấu hình (có thể check qua một API nhỏ hoặc luôn hiện
   và để lỗi tự nhiên nếu chưa cấu hình).
4. Đổi cơ chế xác thực `/api/ingest`:
   - Thêm field `identity` (optional) vào top-level request body trong `src/lib/ingest-schema.ts`
     (`ingestRequestSchema`), không phải trong từng event.
   - Sửa `resolveUser()` trong `src/app/api/ingest/route.ts`: nếu `Authorization` khớp
     `process.env.KS_DASHBOARD_INGEST_TOKEN` (token chung) → dùng `findUserByIdentity(identity)` để tìm
     user (400 nếu thiếu `identity` hoặc không khớp ai — **không tự tạo user mới**, theo quyết định đã
     chốt). Nếu không khớp token chung → fallback về cách cũ (`user.apiKey === token`) để tương thích
     ngược với các key cá nhân đã cấp.
5. Cập nhật plugin (`claude-code-plugin/scripts/`):
   - `ingest.js`/`config.js`: tự lấy `os.userInfo().username` làm `identity` mặc định khi không có
     API key cá nhân, gửi kèm trong body POST (top-level, không phải per-event).
   - Cân nhắc đổi sang đọc `CLAUDE_PLUGIN_OPTION_API_ENDPOINT`/`CLAUDE_PLUGIN_OPTION_API_KEY` trực tiếp
     từ `process.env` thay vì `${user_config.x}` qua argv (đã xác nhận 2 env var này có thật — xem mục
     "Việc đã xong" ở trên) — gọn hơn nhưng không bắt buộc phải đổi ngay.
   - Nhớ tăng version trong `plugin.json` + chạy lại `marketplace update` + `plugin update` để áp dụng.
6. Nghiên cứu kỹ tài liệu API AMIS thật (PDF ở
   `https://helpamis.misa.vn/amis-thong-tin-nhan-su/wp-content/uploads/2022/10/Tai-lieu-tich-hop-API-lay-du-lieu-tu-AMIS-Thong-tin-nhan-su-de-day-sang-phan-mem-khac-Phien-ban-1.pdf`)
   để lấy đúng endpoint/request-response shape (CHƯA fetch được trong phiên này) trước khi viết code
   sync — không đoán URL/field.
7. Viết job đồng bộ AMIS → DB: gọi API AMIS (cần user cung cấp Client ID/Secret thật từ AMIS admin panel
   sau khi kết nối), map field → `Department`/`Team`/`User` (upsert theo `amisEmployeeCode`), tính lại
   `emailLocalPart` mỗi lần sync.
8. Test lại toàn bộ end-to-end (dùng lại pattern trong lịch sử hội thoại: `claude -p "câu hỏi đơn giản
   không dùng tool"` rồi query DB qua Prisma, so sánh với JSON Claude Code tự trả về) sau khi đổi auth.
9. Cập nhật `claude-code-plugin/README.md` + `README.md` gốc mô tả cơ chế xác thực mới.

## Lưu ý quan trọng khi resume

- **Không dùng `--dangerously-skip-permissions` hay `--allowedTools` kèm Bash để tự spawn Claude Code
  lồng nhau** — bị chặn bởi auto-mode classifier (an toàn, không phải bug). Cách test an toàn: dùng
  `claude -p "câu hỏi không cần tool"` (không cần quyền gì), hoặc gọi trực tiếp
  `node claude-code-plugin/scripts/ingest.js <event>` với JSON giả lập qua một file `.js` tạm (dùng
  `JSON.stringify` của Node để tránh lỗi escape backslash trên Windows path — **không** dùng bash string
  interpolation trực tiếp cho JSON chứa đường dẫn Windows, dễ bị lỗi escape).
- **Không đọc `~/.claude/.credentials.json`** — đây là credential OAuth của chính Claude Code, bị
  auto-mode classifier chặn đúng, không cần thiết cho việc này.
- DB hiện tại tại `prisma/dev.db` (SQLite, không commit lên git — đã có trong `.gitignore`). Máy khác sẽ
  cần chạy `npm install && npx prisma db push && npx prisma db seed` (hoặc `npm run db:seed`) để có DB
  mới với admin account (email/password giống hệt, nhưng API key sẽ SINH MỚI — khác với API key đã
  test trên máy này).
- API key admin hiện tại đã dùng để test trên máy này **không ghi vào đây** (tránh lộ credential khi
  push lên GitHub) — lấy lại bằng cách đăng nhập `admin@company.com` rồi vào trang `/me`, hoặc query
  trực tiếp `SELECT apiKey FROM User WHERE email='admin@company.com'` trong `prisma/dev.db`.
