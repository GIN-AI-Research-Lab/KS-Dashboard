# KS Dashboard — Roadmap tính năng

Theo dõi các tính năng đã làm và **chưa làm**. Cập nhật khi hoàn thành từng mục.

---

## ✅ Đã hoàn thành

### Live auto-refresh toàn cục
- [`AutoRefresh`](src/components/AutoRefresh.tsx) gắn trong layout dashboard: `router.refresh()` mỗi 5s làm mới Server Components của route đang xem (mọi trang, không cần sửa từng trang).
- Chỉ chạy khi tab đang hiển thị (Page Visibility API); tab nền dừng hẳn, quay lại refresh ngay.
- Bỏ qua `/live` (đã có SSE riêng qua `liveBus`).

### Nhóm Quick wins (dữ liệu đã có sẵn trong DB)
- **Trang phân tích Công cụ** [`/tools`](src/app/(dashboard)/tools/page.tsx): top tool, tỷ lệ lỗi, thời gian TB, bảng chi tiết.
- **So sánh kỳ trước** trên Tổng quan: ▲▼ % cho token / chi phí / số phiên (ẩn khi kỳ trước = 0).
- **Hiệu quả Cache** trên Tổng quan: cache hit ratio, token đọc từ cache, token tạo cache.
- **Heatmap nhịp độ hoạt động** (giờ × thứ) trên Tổng quan.
- **Tình trạng thu thập dữ liệu** (admin): ai im lặng >7 ngày, chưa gửi dữ liệu, phiên đang mở, tool lỗi.

### Xuất CSV + nâng cấp trang cá nhân
- **Xuất CSV** ([`/api/export/[type]`](src/app/api/export/[type]/route.ts) + [`ExportLink`](src/components/ExportLink.tsx)): nút "Xuất CSV" trên Rankings, Tools, và Ingestion Health (admin). CSV có BOM UTF-8 để Excel hiển thị tiếng Việt.
- **Trang cá nhân `/me`** nâng cấp: streak (ngày hoạt động liên tục), số ngày hoạt động, token/turn, và so sánh với trung bình nhóm.

### Batch "ý tưởng tham khảo" (Copilot Business / Langfuse / ROI frameworks)
- **Trang Áp dụng** [`/adoption`](src/app/(dashboard)/adoption/page.tsx): DAU/WAU/MAU + stickiness, phân loại giai đoạn áp dụng (28 ngày), độ phủ theo nhóm, người mới & đã ngừng dùng.
- **Trang Hiệu quả & Chi phí** [`/roi`](src/app/(dashboard)/roi/page.tsx): tiền tiết kiệm nhờ cache (USD), ROI ước tính (giả định trong [`roi-config.ts`](src/lib/roi-config.ts)), dự báo chi phí cuối tháng (run-rate), chi phí theo tier model, cảnh báo chi phí tăng đột biến.
- **Trang Dự án** [`/projects`](src/app/(dashboard)/projects/page.tsx): chi phí theo dự án + proxy sản lượng (Edit/Write, Bash).
- **Trang Phân tích sâu** [`/insights`](src/app/(dashboard)/insights/page.tsx): percentile độ trễ (tool & phiên), phân bố nguồn phiên & stop reason, tỷ trọng model theo tuần, đỉnh phiên đồng thời.
- **Gamification** trên `/me`: huy hiệu + recap "tuần này vs tuần trước".
- **Bảng điểm theo nhóm** trên Tổng quan: chuẩn hoá per-capita + benchmark trung vị.
- **Timeline annotations**: cấu hình trong [`annotations.ts`](src/lib/annotations.ts), overlay lên biểu đồ DAU.

### Cụm Session (ghi chú / phiên xử lý được vấn đề)
- **Schema**: thêm `outcome` (SOLVED/IN_PROGRESS/ABANDONED), `note`, `tags`, `featured`, `annotatedAt` vào `ClaudeSession`.
- **Trang chi tiết phiên** [`/sessions/[id]`](src/app/(dashboard)/sessions/[id]/page.tsx): dòng thời gian turns + tool calls, số liệu phiên.
- **Ghi chú & đánh dấu kết quả** ([`SessionAnnotationForm`](src/components/SessionAnnotationForm.tsx) + [`PATCH /api/sessions/[id]`](src/app/api/sessions/[id]/route.ts)): chủ phiên hoặc admin gắn kết quả, tag, ghi chú, đánh dấu nổi bật.
- **Thư viện phiên** [`/sessions`](src/app/(dashboard)/sessions/page.tsx): lọc theo kết quả / nổi bật / tìm kiếm ghi chú-tag-dự án-người.

### Biểu đồ & tiện ích nâng cao
- **Sankey chuỗi công cụ** ([`ToolSankey`](src/components/charts/ToolSankey.tsx)) + **Funnel áp dụng** & **Cohort retention** (trang Áp dụng) + **Histogram** phân bố phiên & **Pivot** token theo nhóm×model (Phân tích sâu).
- **Command palette ⌘K + tìm kiếm toàn cục** ([`CommandPalette`](src/components/CommandPalette.tsx) + [`/api/search`](src/app/api/search/route.ts)); nút **Chép link** chia sẻ view có bộ lọc ([`CopyLinkButton`](src/components/CopyLinkButton.tsx)).
- **Tự động nhận diện phiên "thành công"** (heuristic) trên trang chi tiết phiên.
- **Comment + @mention + feedback 👍/👎** ([`SessionDiscussion`](src/components/SessionDiscussion.tsx) + API `comments`/`feedback`). *@mention hiện chỉ tô sáng — chưa gửi thông báo.*
- **Ghi chú theo nhân viên** ([`UserNoteEditor`](src/components/UserNoteEditor.tsx), admin sửa trên trang user).
- **Thư viện** [`/library`](src/app/(dashboard)/library/page.tsx) — mạng chia sẻ **prompt & skill** nội bộ (thay cho "thư viện prompt" cũ):
  - Bài đăng public/private; **comment + @mention**, **react (emoji)**, **★ lưu/bookmark** về tài khoản.
  - **Xếp hạng**: Mới nhất / Nhiều bình luận / Nhiều react / Nhiều lưu; lọc theo Prompt/Skill; tìm kiếm.
  - **Thư viện cá nhân** [`/library/me`](src/app/(dashboard)/library/me/page.tsx): bài của tôi (đổi public/private, xoá) + bài đã lưu.
  - An toàn riêng tư: người dùng tự đăng, app KHÔNG tự thu thập nội dung của ai.
  - **Bố cục blog** (feed 1 cột, thumbnail, excerpt) + **editor Markdown** ([`MarkdownEditor`](src/components/library/MarkdownEditor.tsx)) có toolbar, xem trước, **chèn ảnh** (upload lên `data/uploads` qua [`/api/uploads`](src/app/api/uploads/route.ts), chỉ lưu path trong DB) và **nhập file .md**. Renderer Markdown tự viết, an toàn (chặn `javascript:`).

---

## 🟡 Chưa làm — Ưu tiên trung bình

### 1. Ngân sách (budget targets) + thông báo
- ✅ Đã có: dự báo run-rate + cảnh báo chi phí tăng đột biến (trang `/roi`).
- Còn lại: đặt **hạn mức cứng** theo phòng ban/nhóm (cần bảng `Budget`) và gửi **thông báo** khi vượt.

### 2. Bộ lọc theo team/model trên trang thống kê + cross-filter
- ✅ Đã có: tìm kiếm toàn cục (⌘K) + URL chia sẻ.
- Còn lại: lọc theo team/model ngay trên các trang biểu đồ; click chart để drill-down (cross-filter).

### 3. Team challenges (mục tiêu tuần)
- Đặt mục tiêu theo nhóm và theo dõi tiến độ (cần bảng/cấu hình mục tiêu). Recap cá nhân đã làm.

### 4. Thông báo @mention
- Gửi thông báo khi ai đó được @mention trong bình luận phiên (hiện mới chỉ tô sáng).

---

## 🔵 Chưa làm — Giai đoạn sau (nâng cao)

### 4. Digest định kỳ qua Slack/Email
- Tổng kết ngày/tuần tự động; chạy bằng cron / Task Scheduler như `sync:amis`.

### 5. Presence "đang online" ở Topbar
- Đếm số phiên `ACTIVE` realtime trên mọi trang; tái dùng `liveBus`.

### 6. Cải thiện UX
- Dark-mode toggle (đã có sẵn CSS variables theo theme).
- Skeleton loading, empty states nhất quán.
- Saved views / bộ lọc yêu thích.
- Admin UI cho timeline annotations (hiện sửa trực tiếp trong file config).

---

## Ghi chú kỹ thuật
- Heatmap, bucket theo giờ/tuần, và streak dùng **giờ local của server**. Nếu server khác múi giờ Nhật, cân nhắc chốt cứng `Asia/Tokyo`.
- Các delta "so kỳ trước" và recap tuần sẽ tự hiển thị khi dữ liệu đủ dài.
- Mọi trang đã tự động live nhờ `AutoRefresh`.
- **Phụ thuộc dữ liệu**: một số trường hiện trống trong dev.db nên các số liên quan hiển thị "(không rõ)" cho tới khi được thu thập: `ClaudeSession.projectLabel` (trang Dự án), `ClaudeSession.source` & `Turn.stopReason` (Phân tích sâu). Bảng điểm/độ phủ theo nhóm cần **gán nhóm** cho nhân viên (trang Quản trị) mới có số.
