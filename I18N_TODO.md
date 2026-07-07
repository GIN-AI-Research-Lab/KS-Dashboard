# i18n audit — trạng thái & việc còn lại

Ghi lại tiến độ rà soát đa ngôn ngữ (vi/en/ja) toàn bộ source, để tiếp tục vào phiên sau.
Yêu cầu gốc của user: "rà soát hết lại cả source xem phần nào chưa có i18n đa ngôn ngữ" (đã mở rộng
từ 3 điểm ban đầu: Admin, Thư viện, Tổng quan).

## Cơ chế i18n (đã có từ trước, không đổi)

- Cookie `ks_locale`, 3 locale: `vi` (default), `en`, `ja`. Dictionaries ở
  `src/i18n/dictionaries/{vi,en,ja}.ts`, type `Dictionary = typeof vi`.
- Server component: `const t = await getT()` (từ `@/i18n/server`) hoặc
  `const [x, t] = await Promise.all([..., getT()])`.
- Client component (`"use client"`): `const t = useT()` (từ `@/i18n/I18nProvider`).
- `t("namespace.key")` — dot-path, fallback về key nếu thiếu. **Không hỗ trợ interpolation** — dùng
  `{placeholder}` trong string dictionary rồi `.replace("{placeholder}", value)` ở call site (xem ví dụ
  `overview.taskCategoryFooter`, `roi.forecastHint`, `insights.apiLatencyTitle`).
- Namespace dùng chung, tái sử dụng giữa nhiều trang: `table.*` (input/output/turns/cost/employee/
  department/member/noData), `overview.*` (totalTokens/linesAdded/linesRemoved/acceptanceRate...),
  `common.noData`, `roles.*` (ADMIN/DEPARTMENT_HEAD/MEMBER), `metrics.unitToken` v.v. Luôn kiểm tra các
  namespace này trước khi tạo key mới trùng nghĩa.

## Đã hoàn thành trong phiên này

- **Thư viện (Library)** — 100% xong: `library/page.tsx`, `library/[id]/page.tsx`, `library/me/page.tsx`,
  `LibraryComposer.tsx`, `LibraryFilters.tsx` (+ chuyển `SORTS`/`KIND` labels sang dùng `t()` thay vì bake
  sẵn trong `lib/library.ts`), `LibraryStar.tsx`, `LibraryReactions.tsx` (không có text), `LibraryComments.tsx`,
  `ItemManageBar.tsx`, `MarkdownEditor.tsx` (toolbar + placeholder + sample-insert text).
- **`src/lib/glossary.ts` refactor lớn:** phát hiện `METRIC_HELP`/`GLOSSARY` là object tĩnh tiếng Việt,
  dùng làm tooltip (`<InfoTip>`, `StatCard tooltip=`) ở **hầu hết mọi trang thống kê** — kể cả các trang
  tưởng đã "xong" i18n trước đó (Overview, Adoption). Đã đổi thành `getMetricHelp(t)` /
  `getGlossaryGroups(t)` (nhận `Translate`, trả object đã dịch). Đã sửa tất cả nơi gọi:
  `page.tsx` (Overview, 4 section con), `adoption/page.tsx`, `MemberTable.tsx`, `departments/[id]/page.tsx`,
  `users/[id]/page.tsx`, `me/page.tsx`, `insights/page.tsx`, `sessions/[id]/page.tsx`, `summary/page.tsx`,
  `roi/page.tsx`, `glossary/page.tsx` (trang glossary tự nó cũng dùng `getGlossaryGroups(t)`).
- **`src/lib/access.ts`:** xoá `ROLE_LABELS` (object tĩnh) — mọi nơi dùng đổi sang `t(\`roles.${role}\`)`.
- **`src/lib/session-outcome.ts`:** đổi `OUTCOME_LABEL` (object tĩnh) → `getOutcomeLabel(t)`. Sửa
  `SessionAnnotationForm.tsx`, `SessionFilters.tsx`, `sessions/page.tsx`.
- **Trang đã xong 100%:** `departments/[id]/page.tsx`, `users/[id]/page.tsx`, `me/page.tsx`,
  `insights/page.tsx`, `roi/page.tsx`, `sessions/[id]/page.tsx`, `sessions/page.tsx`, `summary/page.tsx`
  (xoá luôn `export const metadata` title tĩnh tiếng Việt, theo đúng convention các trang khác — không có
  page nào tự set title riêng, dùng default ở `layout.tsx`), `glossary/page.tsx`, `models/page.tsx` (1 chỗ
  sót "Chưa có dữ liệu"), `error.tsx` (dashboard error boundary — nhân tiện sửa luôn `<a>` → `<Link>` cho
  route nội bộ, dọn lint warning có sẵn).
- **Component đã xong:** `SessionAnnotationForm.tsx`, `SessionDiscussion.tsx`, `SessionFilters.tsx`,
  `live/LiveFeed.tsx` (STATUS_LABEL giờ dùng `t("live.running"|"idle"|"ended")` — namespace `live` đã có
  sẵn key này từ trước, tái dùng thay vì tạo key mới; + `connectedLabel`/`reconnectingLabel`/`noSessionsHint`
  mới thêm vào namespace `live`).
- Thêm ~14 namespace mới vào cả 3 dictionary (`departmentDetail`, `userDetail`, `sessionsPage`,
  `sessionDetail`, `me`, `insights`, `summary`, `roi`, `glossary`, `errorBoundary`) + bổ sung key vào
  namespace có sẵn (`common.noData`, `live.*`).
- Đã chạy `rtk tsc` → sạch, không lỗi type. Đã grep lại toàn bộ `src/app/(dashboard)` và `src/components`
  để xác nhận không còn `METRIC_HELP`/`ROLE_LABELS`/`OUTCOME_LABEL` import cũ nào sót lại.

## CHƯA XONG — việc tiếp theo (theo thứ tự nên làm)

### 1. Component UI chung còn hardcode tiếng Việt (ưu tiên cao — dùng ở nhiều trang)

Tìm bằng `grep "[À-ỹ]" src/components -r`, còn lại (đã fix `live/LiveFeed.tsx`):

- `src/components/ui/toast/ToastProvider.tsx:62` — `aria-label="Đóng"`
- `src/components/ui/StatCard.tsx:77` — `"vs kỳ trước"` (hint delta %)
- `src/components/ui/InfoTip.tsx:30` — `aria-label="Giải thích chỉ số"`
- `src/components/sidebar/MobileMenuButton.tsx:12` — `aria-label="Mở menu"`
- `src/components/refresh/refreshPrefs.ts:15-19` — nhãn dropdown ("Tắt", "10 giây", "30 giây", "1 phút",
  "5 phút") — component chọn khoảng tự refresh ở topbar
- `src/components/charts/TrendChart.tsx:54` — `"Chưa có dữ liệu trong khoảng thời gian này"`
- `src/components/charts/ToolSankey.tsx:45` — `"Chưa đủ dữ liệu chuỗi công cụ"`
- `src/components/charts/RankBarChart.tsx:27` — `"Chưa có dữ liệu"`
- `src/components/charts/ModelDonut.tsx:33` — `"Chưa có dữ liệu"`
- `src/components/charts/ActivityHeatmap.tsx:11` — `"Chưa có dữ liệu trong khoảng thời gian này"`
- `src/components/appearance/prefs.ts:11-26` — nhãn theme/accent/density ("Xanh dương", "Tím", "Hồng",
  "Thoáng", "Gọn", "Sáng", "Theo hệ thống", "Tối") — dropdown giao diện ở topbar
- `src/components/UserNoteEditor.tsx:26,30,40,49,54` — toast "Đã lưu ghi chú"/"Lưu thất bại", placeholder,
  nút "Lưu ghi chú"/"Đang lưu...", toast "Đã lưu"
- `src/components/PrintButton.tsx:5` — default label `"In / Lưu PDF"`
- `src/components/ExportLink.tsx:6` — default label `"Xuất CSV"`
- `src/components/CopyTextButton.tsx:7,15,25` — default label `"Chép"`, toast `"Đã sao chép"`, `"Đã chép"`
- `src/components/BadgeGrid.tsx:24` — `"Đã đạt {n}/{m} huy hiệu"`

Gợi ý namespace: có thể gom hết vào 1 namespace `ui` chung (closeAria, moreInfoAria, openMenuAria,
noDataRange — trùng với `table.noData` đã có, nên tái dùng thay vì tạo mới, refreshOff/10s/30s/1m/5m,
themeBlue/Violet/Rose, densityComfortable/Compact, appearanceLight/System/Dark, vs. previous period,
printLabel, exportCsvLabel, copyLabel/copiedToast...).

### 2. API route error messages (ưu tiên thấp hơn — JSON error, không phải page copy)

Các route trả `{ error: "..." }` tiếng Việt thẳng cho client (thường hiển thị qua toast ở frontend):

- `src/app/api/uploads/route.ts:24,27,28`
- `src/app/api/library/route.ts:36,39,59`
- `src/app/api/library/[id]/route.ts:40,45,51,61`
- `src/app/api/export/[type]/route.ts:29,41,60,67` — **đây còn là CSV header/cell** ("Hạng","Tên","Bộ phận"...,
  "Chưa có dữ liệu"/"Im lặng"/"Hoạt động") — xuất file CSV cho người dùng, nên vẫn cần dịch.

Route handler cũng gọi được `getT()` (đọc cookie qua `next/headers`), nên pattern giống hệt server
component — chỉ cần `const t = await getT()` đầu handler rồi dùng `t("...")` thay chuỗi cứng.

### 3. Trang ngoài dashboard layout — chưa đụng tới

- `src/app/login/page.tsx` — toàn bộ trang login (label "Mật khẩu", nút "Đăng nhập", lỗi SSO
  `SSO_ERROR_MESSAGES`, "Tài khoản demo:..."). Trang này nằm ngoài route group `(dashboard)` nhưng vẫn
  trong `I18nProvider` (bọc ở root `layout.tsx`) nên `useT()`/`getT()` vẫn hoạt động bình thường — chưa
  kiểm tra trang này là server hay client component, cần đọc lại trước khi sửa.
- `src/app/opengraph-image.tsx:46` — text "Token, chi phí & phiên làm việc — toàn công ty" trong ảnh OG
  share social. Ưu tiên thấp (ảnh preview link, không phải UI thường dùng); cần nghĩ cách lấy locale cho
  `ImageResponse` (không có request context UI thông thường, có thể phải đọc cookie trực tiếp hoặc chấp
  nhận luôn tiếng Việt/tiếng Anh cố định cho ảnh OG).

### 4. Việc CHƯA BẮT ĐẦU — audit avatar (yêu cầu riêng của user, tách biệt với i18n)

> "tất cả các trang có nhân viên tên nhân viên thì đều phải hiển thị được avatar nếu có avatar. nếu chưa
> có avatar hiển thị icon avatar ẩn danh"

Yêu cầu: mọi nơi hiển thị tên nhân viên phải show `user.image` thật nếu có; nếu không có thì hiện **icon**
avatar ẩn danh (không chỉ là chữ cái đầu tên trong vòng tròn màu như hiện tại — user nói rõ "icon", nên có
thể cần đổi sang icon người dùng generic, ví dụ `lucide-react` `UserRound`/`CircleUserRound`, khi
`user.image` null).

Các vị trí đã biết có pattern "chữ cái đầu trong vòng tròn màu" (initial-letter fallback), cần audit lại +
đổi fallback:
- `src/app/(dashboard)/me/page.tsx` (dòng ~70-78 khu vực trước khi sửa i18n)
- `src/app/(dashboard)/users/[id]/page.tsx` (tương tự)
- `src/app/(dashboard)/library/page.tsx` (avatar tác giả bài viết trong list — dòng ~85, dùng
  `it.author.name.slice(0,1)`, **chưa từng dùng `it.author.image`** — kiểm tra xem `getLibraryFeed` trong
  `stats.ts` có select `image` của author chưa, có thể cần thêm vào query)
- `src/components/live/LiveFeed.tsx` (avatar user trong card phiên trực tuyến)
- Rất có thể còn ở `UserChip` component (dùng trong `LeaderboardTable.tsx`, `LiveTable.tsx`) — cần đọc lại
  `src/components/UserChip.tsx` xem đã handle `image` chưa (theo note cũ trong git log commit "feat: user
  chips (avatar, profile link, badge tooltip)..." — có thể ĐÃ xử lý đúng rồi, cần verify trước khi sửa,
  đừng sửa lại cái đã đúng).
- Cần rà thêm: `sessions/page.tsx` (cột "Người"), `sessions/[id]/page.tsx` (tên user), `admin/page.tsx` /
  `AdminPanel.tsx` (bảng user), bất kỳ chỗ nào khác render `user.name` trực tiếp không qua `UserChip`.

**Việc cần làm khi bắt đầu:** grep toàn bộ `\.name\.slice\(0, ?1\)` hoặc `charAt(0)` để tìm hết pattern
initial-letter, rồi quyết định 1 component chung (ví dụ mở rộng `UserChip` hoặc tạo `Avatar` component mới)
để mọi nơi tái dùng, tránh lặp code 5-6 chỗ khác nhau.

## ✅ ĐÃ HOÀN THÀNH (phiên 2026-07-07)

- **#1 Component UI chung** — xong hết: gom vào namespace `ui` (close/metricInfo/openMenu/vsPrevious/
  refresh*/theme*/accent*/density*/print/exportCsv/copy*/noSankeyData/badgesEarned/note*/weekdaysShort).
  Đã sửa: `ToastProvider`, `InfoTip`, `MobileMenuButton`, `StatCard` (→ client), `PrintButton`, `ExportLink`
  (→ client), `CopyTextButton`, `UserNoteEditor`, `BadgeGrid` (→ async server + getT; **category label +
  tên/mô tả badge trong `getUserGamification` vẫn còn tiếng Việt** — xem "còn lại"), 5 charts
  (`TrendChart`/`ToolSankey`/`RankBarChart`/`ModelDonut`/`ActivityHeatmap` — kèm dịch nhãn thứ `WEEKDAYS`),
  `appearance/prefs.ts` + `refresh/refreshPrefs.ts` (đổi `label` → `labelKey`, cập nhật `AppearanceMenu`/
  `CommandPalette`/`RefreshControl`). Đưa `I18nProvider` ra ngoài `Providers` (root layout) để `ToastProvider`
  dùng được `useT`.
- **#2 API errors + CSV** — xong: namespace `api` (uploads/library errors + CSV headers/status). Sửa
  `api/uploads`, `api/library`, `api/library/[id]`, `api/export/[type]` (dùng `getT()` trong route handler).
- **#3 Login** — xong: namespace `login` (subtitle/password/signIn/SSO errors/or/microsoft/demo).
  `opengraph-image.tsx` **CỐ Ý BỎ QUA** (crawler không gửi cookie → luôn về default `vi`; giá trị thấp).
- **Avatar audit** — xong: tạo `src/components/Avatar.tsx` (ảnh thật nếu có, nếu không → icon ẩn danh
  `lucide UserRound`, KHÔNG dùng chữ cái đầu). Áp dụng: `UserChip`, `Topbar`, `me`, `users/[id]`,
  `library` (tác giả — thêm `image` vào `getLibraryFeed`/`Item`/`MyLibrary` author select), `sessions` list
  + `sessions/[id]` (dùng `UserChip`), `admin AdminPanel` (thêm `image` vào query + `UserRow`). Đã luồng
  `image` vào các user/session select trong `stats.ts`. `live/LiveFeed.tsx` **mồ côi** (không còn import — /live
  dùng `LiveTable`) nên bỏ qua.
- `rtk tsc` sạch, `npm run lint` sạch. grep `[À-ỹ]` còn lại chỉ là ký hiệu `· — → × ▲▼` + OG image (đã nêu).

### Đã bổ sung (phiên 2026-07-07, đợt 2)
- **Nhãn loại task** (`taskCategory.*`): research/code/planning/investigation/other — render qua
  `t(\`taskCategory.${row.category}\`)` ở overview/insights/me (bỏ dùng `row.label` tiếng Việt).
- **Huy hiệu** (`badges.<key>.label/desc` + `badgeCategory.<cat>`): toàn bộ ~35 badge + 8 category.
  `getUserGamification` giờ chỉ trả `key/icon/earned/category`; label/desc/category-name resolve ở render
  (`BadgeGrid`, `UserChip` tooltip). Bỏ `Badge.label/desc` + `BADGE_CATEGORY_LABEL` khỏi `stats.ts`.

### Còn lại (chưa làm)
- **`opengraph-image.tsx`**: 1 dòng tiếng Việt (ảnh OG social preview; crawler không gửi cookie).
- (Tuỳ chọn) avatar cho tác giả bình luận (`SessionDiscussion`/`LibraryComments`) — hiện chưa hiển thị avatar.
- `TASK_CATEGORY_LABEL` + `TaskCategoryRow.label` trong `stats.ts` giờ thừa (không còn render) — có thể dọn.

## Sau khi xong cả 2 việc trên

- Chạy lại `rtk tsc` + `npm run lint` để đảm bảo sạch.
- Grep lại `"[À-ỹ]"` trên toàn bộ `src/` (trừ file dictionary chính chủ `src/i18n/dictionaries/vi.ts`) để
  xác nhận không còn sót gì.
- Test thật qua trình duyệt: đổi locale (vi/en/ja) ở topbar, đi qua từng trang đã sửa, kiểm tra không còn
  key thô (dạng "overview.xxx" hiện ra màn hình — nghĩa là key bị gõ sai/thiếu ở 1 trong 3 dictionary).
