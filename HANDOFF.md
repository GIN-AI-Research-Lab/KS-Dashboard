# KS Dashboard — Handoff / Tiếp tục xử lý

Tài liệu này ghi lại trạng thái hiện tại và các bước còn dang dở để tiếp tục trên máy khác.

## Trạng thái tổng quan

Dashboard cơ bản (Next.js 16 + Prisma/SQLite + NextAuth v5 + Recharts) đã hoạt động đầy đủ và đã test
thật với Claude Code plugin (xác nhận đúng token/chi phí/tool call). SSO Microsoft Entra ID đa domain +
cơ chế xác thực plugin "token chung công ty + tự nhận diện" + job đồng bộ AMIS **đã code xong, đã
type-check sạch, đã test end-to-end bằng dữ liệu giả lập** (xem "Việc đã xong" bên dưới) — chỉ còn
thiếu **credential thật** (Azure App Registration, AMIS Client ID/Secret) từ user/IT để chạy thật với
dữ liệu công ty. Toàn bộ thay đổi trong phiên này **chưa commit** (xem "Trạng thái git" bên dưới).

**Đăng nhập hiện tại:** `admin@company.com` / `admin1234`. DB hiện có thêm **8 tài khoản nhân viên thật**
(`tuent@kstns.biz`, `danhb@kstns.biz`, `danhnq@kstns.biz`, `thuanhm@kstns.biz`, `hungnm@kstns.biz`,
`phuclch@kstns.biz`, `namlh@kstns.biz`) — do user tự thêm qua Admin UI trong lúc test, không phải dữ liệu
giả (mọi dữ liệu **test tự tạo** trong các phiên vá lỗi — user tạm, session tạm — đều đã dọn sạch ngay sau
khi verify xong).

**PHÁT HIỆN & THAY ĐỔI LỚN NHẤT PHIÊN NÀY — đọc kỹ:**

1. **Hook plugin KHÔNG chạy trong Claude Code bản VS Code extension.** Đã chứng minh trực tiếp bằng thực
   nghiệm (thêm log ghi file vô điều kiện ở đầu `ingest.js`, chat cả phiên gọi hàng chục tool → ZERO dấu
   vết hook; trong khi gọi script tay thì chạy đúng). Đây là giới hạn của bản extension (chỉ bản CLI
   terminal mới chạy hook do plugin cung cấp trong `hooks/hooks.json`). **Không phải lỗi code.**
2. **OTel export của Claude Code chạy tốt trong extension** và trả về `user.email` thật + token + cost +
   model + tool — nhiều hơn hook. Đã verify 100% bằng dữ liệu thật (Claude Code v2.1.199).
3. **QUYẾT ĐỊNH MỚI CỦA USER (thay quyết định cũ "hook làm chính"):** vì hook chết trong extension, đã
   **chuyển `/live` sang lấy dữ liệu từ OTel** (Lối A). Receiver `/api/otel/logs` giờ populate thẳng
   `ClaudeSession`/`Turn`/`ToolCall` (bảng mà `/live` + stats đọc) + publish liveBus real-time.
   **Đã test end-to-end THÀNH CÔNG với phiên chat thật của user** — dashboard tự bắt được phiên đang chạy,
   gán đúng `tuent@kstns.biz` (từ `tuent@sint.co.jp`), token/cost/turn/tool đều đúng, KHÔNG cần hook,
   KHÔNG cần cấu hình gì từng người.
4. **Plugin (hook) giờ là phụ, chỉ còn ý nghĩa cho bản CLI.** Vẫn giữ nguyên, đã làm zero-config (bake
   sẵn endpoint + token trong `config.js`) nhưng vô dụng trong extension. **Cảnh báo double-count:** nếu
   một máy CHẠY CLI + bật cả OTel + cài plugin hook thì Turn bị đếm 2 lần (hook tạo Turn từ transcript,
   OTel tạo Turn từ `api_request`). Trên extension không xảy ra (hook không chạy). Rollout nên chọn MỘT
   trong hai, không bật cả hai trên cùng máy CLI.

## Việc đã xong (đã test/verify thật)

### Từ các phiên trước
- Next.js 16 app đầy đủ trang: Tổng quan, Cá nhân, Nhóm/Bộ phận, Xếp hạng, Model, Live (SSE),
  Quản trị (CRUD user/team/department). Route đã đổi tên `middleware.ts` → `src/proxy.ts` (Next 16 rename,
  xác nhận đúng theo `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).
- Prisma schema: Department/Team/User/ClaudeSession/Turn/ToolCall, `User.emailLocalPart` (unique, khớp đa
  domain), `User.amisEmployeeCode`/`lastAmisSyncAt` (khoá upsert AMIS). Pin Prisma `^6` (Prisma 7 đổi cấu
  hình datasource, không tương thích cách viết hiện tại — vẫn còn cảnh báo "6.19.3 -> 7.8.0 available" khi
  chạy `prisma db push`, **không nâng cấp**, đã biết và chủ đích).
- Claude Code plugin (`claude-code-plugin/`) — đã cài thật, verify token/chi phí khớp chính xác. 3 lỗi đã
  tìm và sửa (duplicate hooks file, `Stop` không chạy qua `claude -p`, thiếu cache 1h). Chi tiết xem lịch
  sử git commit "WIP: multi-domain SSO...".
- Đã nghiên cứu MISA AMIS: AMIS **không** hỗ trợ làm SSO/IdP cho web bên thứ ba (chỉ tiêu thụ SSO
  Google/Microsoft/Apple để đăng nhập vào chính AMIS).

### Phiên này (tiếp tục xử lý handoff.md)
- **`npm install` xong** (máy này chưa có `node_modules`) — nhân tiện xác nhận
  `node_modules/next/dist/docs/` có thật, đọc kỹ mục Proxy + Authentication trước khi sửa code theo đúng
  yêu cầu `AGENTS.md`.
- **`npx tsc --noEmit` sạch** — sửa 2 lỗi type thật:
  1. `src/auth.ts`: mảng `providers` phải khai báo kiểu `Provider[]` (từ `next-auth/providers`) trước khi
     `push()` một OIDC provider vào mảng chỉ có Credentials provider.
  2. `src/app/api/admin/users/route.ts`: **bug thật** — tạo user qua API admin thiếu hẳn `emailLocalPart`
     (field bắt buộc + unique từ khi thêm đa domain), sẽ crash lúc runtime dù TS báo lỗi khác
     (departmentId null/undefined). Đã sửa: tính `emailLocalPart` từ email, set tường minh
     `departmentId`/`teamId` null thay vì spread.
- **`.env` / `.env.example` đã tạo** (trước đây máy nào cũng chưa có, kể cả `.env.example`) — thêm
  `!.env.example` vào `.gitignore` (trước đó `.env*` chặn cả file mẫu). `.env` cục bộ có `AUTH_SECRET` +
  `KS_DASHBOARD_INGEST_TOKEN` **tự sinh ngẫu nhiên cho máy này** — **không ghi giá trị thật vào file này**
  (bài học từ commit "Redact leaked API key from HANDOFF.md" trước đó). Đã chạy `db push` + `db seed`
  thành công trên máy này, chỉ có admin.
- **Nút "Đăng nhập bằng Microsoft"** ở `src/app/login/page.tsx` — chỉ hiện khi `GET /api/auth/providers`
  (route có sẵn của NextAuth) trả về có `microsoft-entra-id`; hiển thị lỗi SSO (`DomainNotAllowed`,
  `UnknownEmployee`, `NoEmailFromProvider`) dịch sang tiếng Việt từ query param `?error=`.
- **`/api/ingest` hỗ trợ 2 kiểu Bearer token** (`src/lib/ingest-schema.ts` + `src/app/api/ingest/route.ts`):
  cá nhân (`user.apiKey`, không đổi) **hoặc** token chung `KS_DASHBOARD_INGEST_TOKEN` + field `identity`
  top-level trong body → khớp qua `findUserByIdentity()`. Sai/thiếu `identity` → 400, **không tự tạo
  user mới** (đúng quyết định đã chốt).
- **Plugin đã cập nhật** (`claude-code-plugin/scripts/config.js` tự lấy `os.userInfo().username` làm
  `identity`, `ingest.js` gửi kèm top-level trong POST body) + bump `plugin.json` lên `1.0.5` + cập nhật mô
  tả `api_key` trong `userConfig`. **Chưa chạy** `marketplace update`/`plugin update` thật (máy này không
  có marketplace cục bộ đã đăng ký như máy trước — xem TODO).
- **Đã lấy được tài liệu API AMIS thật** (PDF ở link cũ trong HANDOFF) bằng cách WebFetch tải PDF về rồi
  dùng `pdf-parse` (cài tạm trong thư mục scratchpad, không phải dependency của repo) để trích text — công
  cụ đọc PDF trực tiếp (poppler) không có sẵn trên máy Windows này. Xác nhận:
  - `POST https://amisapp.misa.vn/APIS/HRMProfileOpenAPI/api/Open/get-data-employee`
  - Header: `x-clientid` (Mã kết nối), `x-transactionid` (GUID mới mỗi lần gọi),
    `x-token` = `HMACSHA256(secretKey, transactionId)` base64 (secretKey = Khóa bảo mật).
  - Body: `{"PageSize": -1, "PageIndex": 1}` (-1 = lấy tất cả).
  - Response: `Data.DataEmployee[]` với `EmployeeCode`, `FullName`, `Email`/`OfficeEmail` (nhiều bản ghi có
    thể `null`), `OrganizationUnitName`, `EmployeeStatusID` (1 = đang làm việc). **Không có field nào cho
    "Team"** — chỉ có 1 cấp đơn vị tổ chức (`OrganizationUnitName`), nên job sync chỉ map được
    `Department`, **Team vẫn phải gán tay** qua trang Quản trị.
- **Job đồng bộ AMIS đã viết**: `src/lib/amis.ts` (HTTP client + auth header, theo đúng tài liệu ở trên,
  có loop theo `GetLastData` phòng trường hợp server phân trang dù tài liệu nói `PageSize:-1` trả hết 1
  lần), `src/lib/amis-sync.ts` (upsert `Department` theo `OrganizationUnitName`, upsert `User` theo
  **`amisEmployeeCode` HOẶC `emailLocalPart`** — cố ý không dùng `prisma.user.upsert()` một khoá vì user có
  thể đã tồn tại từ trước qua admin tạo tay hoặc SSO, tránh crash trùng email khi lần đầu chạy sync), bỏ
  qua nhân viên nghỉ việc (`EmployeeStatusID !== 1`) hoặc không có email nào (`Email`/`OfficeEmail` đều
  null — không có gì để khớp). `scripts/amis-sync.ts` là entry point CLI, chạy bằng `npm run sync:amis`.
  Env cần: `AMIS_CLIENT_ID`, `AMIS_SECRET_KEY` (đã thêm placeholder rỗng vào `.env`/`.env.example`).
- **Đã test end-to-end thật trên dev server local** (không dùng `claude -p` lồng nhau, đúng lưu ý an toàn
  bên dưới): khởi động `npm run dev`, dùng `curl` xác nhận cả 5 nhánh của `/api/ingest`
  (token chung + identity đúng → 200, token chung + identity sai → 400, token chung + thiếu identity → 400,
  API key cá nhân cũ + không có identity → 200 tương thích ngược, token bậy → 401), sau đó chạy **thật**
  `node claude-code-plugin/scripts/ingest.js <event>` qua đủ vòng đời session (session_start → prompt →
  tool_start → tool_end → session_end) với 1 user test tạm có `emailLocalPart` khớp username Windows thật
  của máy (`os`), xác nhận DB ghi đúng `ClaudeSession`/`ToolCall`. **Đã xoá sạch mọi dữ liệu test** (user
  tạm + các session test) ngay sau khi verify xong — DB hiện tại lại chỉ có admin.
- **`npm run lint` sạch** cho mọi thứ đụng tới trong phiên này: sửa lỗi `react-hooks/set-state-in-effect`
  ở trang login (chuyển sang tính `ssoError` trực tiếp lúc render thay vì set state trong `useEffect`), và
  thêm `claude-code-plugin/**` vào `globalIgnores` của `eslint.config.mjs` (các script CommonJS chạy trực
  tiếp bằng `node script.js`, không thuộc app Next.js/TypeScript — lỗi `no-require-imports` ở đây là lỗi
  cấu hình có sẵn từ trước, không phải do phiên này gây ra, nhưng tiện sửa luôn vì cùng chỗ).
  **Lưu ý:** vẫn còn 1 lỗi lint **có sẵn từ trước, không liên quan** ở
  `src/components/live/LiveFeed.tsx:98` (`Cannot access refs during render`) — chưa đụng vào, để nguyên
  theo đúng phạm vi phiên này.
- **Đã cập nhật docs**: `claude-code-plugin/README.md` (2 cách lấy API key: token chung công ty hoặc key
  cá nhân, thêm mục lỗi 400 do sai identity) và `README.md` gốc (mục "Login & identity" mới giải thích
  toàn bộ cơ chế local-part matching + SSO + AMIS sync, sửa vài chỗ lỗi thời: `middleware.ts` → `proxy.ts`,
  `db:seed` không còn tạo dữ liệu giả, bỏ tài khoản demo nhân viên không còn tồn tại).

### Phiên này (tiếp) — OTel bổ sung định danh thật

User hỏi lại việc Claude Code có trả email tài khoản cho plugin không (câu trả lời vẫn là **không**, đã
verify lại qua tài liệu chính thức mới nhất — hook JSON stdin + biến môi trường không có field email nào).
Nhưng user phát hiện Claude Code có **OpenTelemetry (OTel) export** built-in — verify thật bằng cách bật
thử trên máy user (không tự làm được vì máy tôi chạy không có sẵn CLI `claude`):

- **Cách bật đã xác nhận đúng:** `CLAUDE_CODE_ENABLE_TELEMETRY=1`, `OTEL_LOGS_EXPORTER=otlp`,
  `OTEL_EXPORTER_OTLP_PROTOCOL=http/json`, `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=<url>` — set qua
  `env` key trong `settings.json` (đọc được cả bởi VS Code extension, không chỉ CLI thuần), biến chỉ có
  hiệu lực khi **khởi động lại toàn bộ VS Code** (không phải mở tab chat mới).
- **Sự cố khi test (bài học quan trọng):** lúc đầu tôi sửa nhầm vào `~/.claude/settings.json` **toàn cục**
  (ảnh hưởng mọi project khác của user) dựa trên nghiên cứu của agent (agent lấy đúng cơ chế nhưng vài chi
  tiết linh tinh nghe khá chắc là bịa — tên setting VS Code, tên biến `OTEL_LOGS_EXPORT_INTERVAL`, số issue
  GitHub cụ thể — **đừng tin các chi tiết quá cụ thể/ngách agent tự đưa ra nếu chưa verify được qua tài
  liệu chính chủ**). Bị auto-mode classifier chặn đúng vì sửa file cá nhân toàn cục dựa trên info chưa
  chắc + phạm vi quá rộng. Đã sửa: revert global, chuyển cấu hình sang
  `e:\KS-Dashboard\.claude\settings.local.json` (chỉ áp dụng trong project này, đã có sẵn trong
  `.gitignore`) — **cách đúng để test OTel cho một project cụ thể, không đụng global**.
- **Dữ liệu thật nhận được (Claude Code v2.1.199, 2026-07-03), 1 phát hiện quan trọng khác với tài liệu:**
  `user.email` (và `session.id`, `user.id`, `organization.id`, `user.account_uuid`) nằm trong
  **`attributes` của từng log record** (`resourceLogs[].scopeLogs[].logRecords[].attributes[]`), **KHÔNG
  phải** `resource.attributes` như tài liệu OTel/Claude Code mô tả (resource chỉ có `host.arch`/`os.type`/
  `service.name`/`service.version`). Code đầu tiên tôi viết tìm sai chỗ nên trả `email: null` dù nhận
  đúng dữ liệu — đã sửa. **Bài học: luôn verify chỗ thật của field bằng data thật, đừng tin cấu trúc suy ra
  từ tài liệu.**
  Các event thật quan sát được: `claude_code.user_prompt`, `claude_code.api_request` (có sẵn
  `cost_usd`/`input_tokens`/`output_tokens`/`cache_read_tokens`/`cache_creation_tokens`/`model`/
  `duration_ms`), `claude_code.assistant_response`, `claude_code.tool_decision`, `claude_code.tool_result`
  (có `tool_use_id` **ổn định** — hơn hẳn hàng đợi FIFO plugin đang tự dựng), `claude_code.hook_execution_start`/
  `complete`. Không thấy `session_start`/`session_end` trong lần test này.
- **Quyết định BAN ĐẦU của user (SAU ĐÓ ĐÃ ĐỔI — xem mục "Lối A" bên dưới):** giữ hook làm chính, OTel chỉ
  bổ sung email. Bước đầu đã code theo hướng này:
  - Model mới `SessionIdentity { sessionId @id, email, updatedAt }` trong `prisma/schema.prisma`
    (đã `db push` + `generate` — gặp lại lỗi khoá file DLL Windows quen thuộc, sửa bằng cách tắt dev
    server trước khi generate, đúng như ghi chú cũ).
  - Endpoint `src/app/api/otel/logs/route.ts` (thay cho `/api/otel-test` giờ đã xoá). Thêm exception trong
    `src/proxy.ts` (route này không cần session cookie, giống `/api/ingest`).
  - `resolveUser()` trong `src/app/api/ingest/route.ts`: với nhánh token chung, **ưu tiên** email lấy từ
    `SessionIdentity`, **fallback** về `identity` (username Windows). Không đổi gì ở plugin — tương thích
    ngược. (Nhánh này vẫn còn nguyên, dùng cho bản CLI; nhưng không còn là đường chính.)

### Phiên này (tiếp) — LỐI A: /live lấy dữ liệu từ OTel (quyết định cuối cùng)

Sau khi chứng minh hook chết trong extension (xem mục đầu file), user chọn **Lối A**: cho `/live` đọc từ
OTel thay vì hook. Đã code + test thật thành công:
- **`src/app/api/otel/logs/route.ts` viết lại hoàn toàn**: giờ parse mọi log record OTLP, map:
  - `claude_code.user_prompt` → tạo/cập nhật `ClaudeSession` (status ACTIVE, promptCount++).
  - `claude_code.api_request` → tạo `Turn` (khoá idempotent `externalId = request_id`, chống trùng khi
    OTel gửi lại), cộng dồn token/cost/turnCount vào session, set model, status IDLE.
  - `claude_code.tool_result` → upsert `ToolCall` (id = `tool_use_id`, ổn định), toolCallCount++.
  - Mỗi event publish `liveBus` (session_start/prompt/turn/tool_end) để `/live` cập nhật real-time.
  - User được gán qua `user.email` OTel → `findUserByIdentity()` (khớp local-part, chặn domain lạ). Không
    khớp user nào thì bỏ qua (vẫn ghi `SessionIdentity`).
- **Schema:** thêm `Turn.externalId String? @unique` (đã `db push --accept-data-loss` vì thêm cột unique
  vào bảng Turn đang rỗng — an toàn).
- **Đã test end-to-end THẬT 2 cách:**
  1. curl payload OTLP giả lập (prompt+api_request+tool_result) → tạo đúng session/turn/toolcall, gán đúng
     `tuent@kstns.biz`, token/cost đúng; gửi lại y hệt (giả lập retry) → turnCount/toolCallCount/token
     KHÔNG đổi (idempotent OK); chỉ `promptCount` tăng (user_prompt chưa có khoá chống trùng — số phụ,
     chấp nhận được, đã ghi TODO).
  2. **Phiên chat Claude Code THẬT của user**: OTel tự chảy vào `/api/otel/logs`, dashboard tự bắt được
     phiên đang chạy `8ed2c7ac...`, gán đúng `tuent@kstns.biz`, turnCount/toolCall/cost/token đều thật —
     KHÔNG hook, KHÔNG cấu hình per-user. Xác nhận `/live` hoạt động qua OTel.
- **Zero-config plugin (hook path, chỉ còn cho CLI):** đã bake sẵn `DEFAULT_API_ENDPOINT` + `DEFAULT_API_KEY`
  vào `claude-code-plugin/scripts/config.js` (fallback cuối sau argv + env) → cài plugin là chạy, không cần
  `/plugin configure`. Bump plugin `1.0.5 → 1.0.6`. **Cảnh báo bảo mật:** `DEFAULT_API_KEY` (token chung)
  giờ nằm trong file committed — rotate trước khi push lên remote công khai.
- `.claude/settings.local.json` (gitignored) chứa 4 biến OTel + 2 biến plugin.

### Phiên này (tiếp) — truy cập từ máy khác qua nip.io + đổi port 4000 + bỏ key ở trang Cá nhân

- **Bỏ phần "Kết nối Claude Code plugin" (API key) ở trang `/me`** (`src/app/(dashboard)/me/page.tsx`) —
  vì giờ không cần key cá nhân nữa (OTel tự nhận diện). Đã bỏ import `ApiKeyBox` + card đó. Backend
  `apiKey` + `/api/me/regenerate-key` vẫn còn (vô hại, chưa gỡ).
- **PHÁT HIỆN QUAN TRỌNG — port 3000 bị chiếm trên IPv4:** máy khác không vào được dashboard qua LAN/nip.io
  vì service Windows **`iphlpsvc` (IP Helper, PID 4552)** đã chiếm sẵn `0.0.0.0:3000` ở tầng kernel →
  Next.js chỉ phục vụ được qua IPv6 (`localhost`), mọi kết nối IPv4 (`127.0.0.1`, IP LAN, nip.io) đều chết
  (curl trả `000`). **Chẩn đoán bằng cách thử port 4000 → 127.0.0.1/IP-LAN/nip.io đều 200.** →
  **Đã đổi dashboard sang port 4000** (`package.json`: `next dev -p 4000`, `next start -p 4000`).
  Port 3000 KHÔNG nằm trong `netsh int ipv4 show excludedportrange` — nên đây là iphlpsvc chiếm động, khó
  gỡ; đổi port là cách sạch nhất.
- **BẪY: `next dev -H 0.0.0.0` làm Next.js 16 Turbopack 404 TOÀN BỘ route** (kể cả `/`). Bỏ `-H` đi thì
  chạy đúng, và Next 16 dev **mặc định đã bind ra LAN** rồi (log hiện `Network: http://<lan-ip>:4000`).
  → **Không dùng `-H 0.0.0.0`.**
- **nip.io hoạt động tốt** (đã test end-to-end: `http://192.168.1.93.nip.io:4000/login` → 200, POST
  `/api/otel/logs` → tạo session gán đúng user). nip.io chỉ là DNS wildcard: `<ip>.nip.io` → `<ip>`.
- **Đã bake URL nip.io:4000 vào:** `.claude/settings.local.json` (OTel endpoint, máy này) +
  `claude-code-plugin/scripts/config.js` `DEFAULT_API_ENDPOINT` (đường CLI). Bump plugin `1.0.6 → 1.0.7`,
  đã sync vào cache.
- **`src/auth.ts`: thêm `trustHost: true`** để đăng nhập hoạt động khi truy cập qua hostname nip.io (không
  chỉ localhost). An toàn vì đây là mạng nội bộ tin cậy.
- **CẢNH BÁO QUAN TRỌNG về "public":** `192.168.1.93` là **IP LAN** → chỉ máy **cùng mạng nội bộ** mới
  vào được. nip.io KHÔNG làm nó public. Để người ở mạng khác / internet truy cập thật cần: (a) tunnel như
  `cloudflared`/`ngrok` (cho URL https public, KHÔNG cần mở router — cách khuyến nghị cho "public dev"),
  hoặc (b) IP public + port-forward trên router. Ngoài ra IP LAN có thể đổi (DHCP) → nên đặt static IP /
  DHCP reservation, nếu không URL bake cứng sẽ hỏng. **Nếu chuyển sang tunnel/domain thật, phải sửa lại URL
  ở 2 chỗ đã bake + settings client.**
- **Setup máy khác (client):** thêm vào `~/.claude/settings.json` của họ 4 biến OTel trỏ
  `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://192.168.1.93.nip.io:4000/api/otel/logs`, restart hẳn VS Code.
  Xem dashboard tại `http://192.168.1.93.nip.io:4000` (cần có tài khoản đăng nhập).

## Quyết định kiến trúc đã chốt với user (không đổi, đã code đúng theo)

1. **Đăng nhập web:** Microsoft Entra ID SSO, endpoint multi-tenant mặc định (`issuer` để trống), tự lọc
   domain trong callback `signIn`.
2. **Liên kết tài khoản đa domain:** khớp theo **local-part** (phần trước @), không quan tâm domain.
3. **Plugin dùng 1 token chung cho cả công ty** + tự nhận diện theo **username Windows hiện tại**, khớp
   theo local-part giống hệt đăng nhập web.
4. **AMIS sync:** đồng bộ định kỳ/thủ công **User + Department** (không có Team — API không trả field
   này) từ AMIS vào DB, upsert theo `amisEmployeeCode`.
5. **`/live` lấy dữ liệu từ OTel (Lối A — quyết định cuối, thay cho "hook làm chính"):** vì hook plugin
   không chạy trong VS Code extension, pipeline chính giờ là OTel export của Claude Code →
   `/api/otel/logs` → `ClaudeSession`/`Turn`/`ToolCall`. Hook plugin + `/api/ingest` giữ lại làm đường phụ
   cho bản CLI (đừng bật cả hai trên cùng 1 máy CLI — double-count Turn). Mỗi phiên Claude Code
   (`session.id` riêng) = 1 `ClaudeSession` riêng = 1 card riêng trên `/live`.

## Trạng thái git

**Chưa commit gì trong phiên này** (đúng theo nguyên tắc chỉ commit khi user yêu cầu rõ ràng). File đã sửa/mới:

```
M  .gitignore                                (+!.env.example)
M  README.md                                 (mục Login & identity mới, sửa lỗi thời)
M  claude-code-plugin/.claude-plugin/plugin.json   (version 1.0.4 -> 1.0.5)
M  claude-code-plugin/README.md              (2 cách lấy API key)
M  claude-code-plugin/scripts/config.js      (identity = os.userInfo().username)
M  claude-code-plugin/scripts/ingest.js      (gửi identity top-level)
M  eslint.config.mjs                         (ignore claude-code-plugin/**)
M  package.json                              (+ script sync:amis)
M  prisma/schema.prisma                      (+ model SessionIdentity)
M  src/app/api/admin/users/route.ts          (fix thiếu emailLocalPart)
M  src/app/api/ingest/route.ts               (2 kiểu Bearer token + ưu tiên email từ SessionIdentity)
M  src/app/login/page.tsx                    (nút Microsoft + hiển thị lỗi SSO)
M  src/auth.ts                               (đã có từ trước, chỉ fix type providers[])
M  src/lib/ingest-schema.ts                  (+ field identity)
M  src/proxy.ts                              (exception cho /api/otel/logs)
?? .env.example                              (mới, cần add vào git)
?? scripts/                                  (scripts/amis-sync.ts, mới)
?? src/lib/amis.ts                           (mới)
?? src/lib/amis-sync.ts                      (mới)
?? src/app/api/otel/                         (route.ts nhận OTel logs, mới)
```

`.env` (thật, có secret sinh cho máy này), `.claude/settings.local.json` (cấu hình OTel test cho project
này), và `prisma/dev.db` **cố ý không nằm trong danh sách trên** — đã bị `.gitignore` chặn, đúng ý.

## TODO — việc còn lại

1. **Cần credential thật để test thật** (không thể tự làm tiếp nếu không có):
   - Azure/Entra admin tạo App Registration, redirect URI
     `<domain>/api/auth/callback/microsoft-entra-id`, điền `AUTH_MICROSOFT_ENTRA_ID_ID`/`_SECRET`/`_ISSUER`
     vào `.env`, bật thật nút "Đăng nhập bằng Microsoft", test với 1 tài khoản Microsoft 365 thật.
   - AMIS admin lấy Client ID ("Mã kết nối") + Secret ("Khóa bảo mật") từ AMIS > Thiết lập > Quản trị dữ
     liệu > Kết nối ứng dụng, điền `AMIS_CLIENT_ID`/`AMIS_SECRET_KEY` vào `.env`, chạy thử
     `npm run sync:amis`, kiểm tra vài bản ghi thật (đặc biệt: có bao nhiêu nhân viên không có
     `Email`/`OfficeEmail` sẽ bị bỏ qua — có thể cần yêu cầu AMIS admin điền email cho những người này nếu
     muốn họ dùng được dashboard).
2. **Rollout plugin:** tăng version đã xong (1.0.5) nhưng máy này chưa đăng ký marketplace cục bộ như máy
   trước — cần `claude plugin marketplace add`/`update` + `claude plugin update` trên máy có cài đặt thật,
   rồi phát `KS_DASHBOARD_INGEST_TOKEN` mới cho nhân viên qua IT (một token cho cả công ty, không phải
   một key/người nữa).
3. **Lên lịch chạy `npm run sync:amis` định kỳ** khi đã deploy lên server thật (cron/Windows Task
   Scheduler) — hiện tại mới chỉ chạy tay được, chưa có hạ tầng lịch trong repo (cố tình không tự thêm gì
   phức tạp hơn khi chưa biết môi trường deploy thật là gì).
4. Sau khi có SSO thật hoạt động, cân nhắc thêm chỗ để admin sync AMIS qua UI thay vì chỉ CLI (hiện tại
   `npm run sync:amis` là đủ dùng, chưa làm nút bấm trong trang Quản trị vì không nằm trong yêu cầu ban
   đầu — dễ thêm sau: gọi `runAmisSync()` từ một route `POST /api/admin/amis-sync` bọc `requireRole(["ADMIN"])`).
5. Sửa lỗi lint có sẵn (không liên quan phiên này) ở `src/components/live/LiveFeed.tsx:98` — ghi ref
   (`sessionsRef.current = sessions`) ngay trong thân render, ESLint mới của Next 16 coi là lỗi
   (`react-hooks/refs`); cách sửa chuẩn là chuyển việc gán đó vào một `useEffect`.
6. Review + `git add` + commit toàn bộ danh sách ở mục "Trạng thái git" khi user sẵn sàng (bao gồm
   `.env.example` mới — **không bao giờ** add `.env` thật).
7. **OTel identity — chưa test round-trip thật với `/api/otel/logs` mới:** lần cuối test bằng curl giả
   lập; phiên chat thật của user lúc nãy còn trỏ vào `/api/otel-test` (đã xoá). Cần: user khởi động lại
   VS Code lần nữa để phiên Claude Code thật đọc đúng endpoint `/api/otel/logs` mới trong
   `.claude/settings.local.json`, rồi chat vài câu, kiểm tra bảng `SessionIdentity` trong `prisma/dev.db`
   có ghi đúng không (`npx prisma studio` hoặc query trực tiếp).
8. **Rollout OTel cho cả công ty (nếu quyết định làm thật):** cấu hình hiện tại chỉ nằm trong
   `.claude/settings.local.json` của project này trên máy user — chưa nghĩ tới cách đẩy 4 biến
   (`CLAUDE_CODE_ENABLE_TELEMETRY`, `OTEL_LOGS_EXPORTER`, `OTEL_EXPORTER_OTLP_PROTOCOL`,
   `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`) hàng loạt cho nhân viên (managed settings của tổ chức, hay đẩy qua
   `.claude/settings.json` **commit vào repo dùng chung** thay vì file local — cần bàn với user, chưa
   quyết).

## Lưu ý quan trọng khi resume

- **Không dùng `--dangerously-skip-permissions` hay `--allowedTools` kèm Bash để tự spawn Claude Code
  lồng nhau** — bị chặn bởi auto-mode classifier (an toàn, không phải bug). Cách test an toàn đã dùng
  thành công trong phiên này: `curl` thẳng vào `/api/ingest` đang chạy local, và gọi trực tiếp
  `node claude-code-plugin/scripts/ingest.js <event>` với JSON giả lập qua stdin (không qua bash string
  interpolation cho JSON phức tạp — dùng file `.js` tạm với `JSON.stringify` nếu payload phức tạp hơn vài
  field).
- **Không đọc `~/.claude/.credentials.json`** — bị auto-mode classifier chặn đúng, không cần thiết.
- **Đọc PDF không có poppler trên máy Windows:** `Read` tool cần `pdftoppm` (poppler-utils) để render PDF,
  không có sẵn trên Windows. Cách vòng đã dùng thành công: `WebFetch` tải PDF về (link sẽ được lưu vào
  `tool-results/*.pdf` trong thư mục project của Claude), rồi cài tạm `pdf-parse` trong thư mục scratchpad
  (`npm install pdf-parse --no-save`, **không phải dependency của repo**) và viết 1 script Node dùng
  `new PDFParse({data}).getText()` để trích text ra file `.txt` rồi đọc bằng `Read` bình thường.
- DB hiện tại tại `prisma/dev.db` (SQLite, không commit — đã có trong `.gitignore`). Máy khác cần chạy
  `npm install && cp .env.example .env` (điền `AUTH_SECRET` ít nhất) `&& npx prisma db push && npm run
  db:seed` để có DB mới với admin account (email/password giống hệt, API key sẽ SINH MỚI).
- API key admin hiện tại **không ghi vào đây** (tránh lộ credential khi push lên GitHub — bài học từ
  commit "Redact leaked API key from HANDOFF.md") — lấy lại bằng cách đăng nhập `admin@company.com` rồi
  vào trang `/me`, hoặc query `SELECT apiKey FROM User WHERE email='admin@company.com'` trong
  `prisma/dev.db`. Tương tự: **không ghi giá trị thật** của `AUTH_SECRET` / `KS_DASHBOARD_INGEST_TOKEN` /
  `AMIS_CLIENT_ID` / `AMIS_SECRET_KEY` vào file này dù chỉ để tham khảo — luôn chỉ mô tả bằng lời, giá trị
  thật chỉ sống trong `.env` (gitignored).
- **Không sửa `~/.claude/settings.json` (global, ngoài thư mục project) để test config riêng cho 1
  project** — dùng `<project>/.claude/settings.local.json` thay thế (đã có sẵn trong `.gitignore` của
  project này). Global ảnh hưởng mọi project khác của user, dễ gây tác dụng phụ không mong muốn; auto-mode
  classifier có thể (và nên) chặn việc này.
- **Đừng tin các chi tiết quá cụ thể mà sub-agent tra cứu đưa ra nếu không tự verify được** (tên setting
  UI cụ thể, tên biến môi trường lạ, số issue GitHub...) — agent vẫn có thể bịa nghe rất thật. Luôn ưu
  tiên test bằng dữ liệu thật (như đã làm với OTel: gửi payload giả lập trước, rồi test thật, phát hiện
  ngay chỗ tài liệu sai — `user.email` nằm ở log record attributes chứ không phải resource attributes).
- Máy chạy phiên Claude Code của user **không có** CLI `claude` trong PATH của môi trường Bash tool này —
  không tự chạy được `claude -p` hay bất kỳ lệnh `claude` nào để test; mọi test cần Claude Code thật phải
  nhờ user chạy trên máy/terminal của họ rồi báo lại kết quả.
