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

---

## 🟡 Chưa làm — Ưu tiên trung bình (cần thêm logic / bảng mới)

### 1. Xuất CSV / báo cáo
- Nút export trên các bảng (rankings, tools, ingestion health, member breakdown).
- Báo cáo tổng hợp theo kỳ (token/chi phí theo phòng ban/nhóm).
- Gợi ý: route handler `/api/export/...` trả `text/csv`, tái dùng các hàm trong `src/lib/stats.ts`.

### 2. Nâng cấp trang cá nhân `/me`
- Xu hướng cá nhân theo ngày, tool cá nhân hay dùng.
- **Streak**: số ngày hoạt động liên tục (dựa trên `Turn.createdAt`).
- So sánh cá nhân với trung bình nhóm.

### 3. Ngân sách & cảnh báo chi phí
- Đặt hạn mức chi phí theo phòng ban/nhóm (cần bảng mới, ví dụ `Budget`).
- Dự báo chi phí cuối tháng (run-rate từ dữ liệu tới hiện tại).
- Cảnh báo khi vượt ngưỡng hoặc chi phí tăng đột biến.

### 4. So sánh nhóm ↔ nhóm / phòng ↔ phòng
- Bảng + biểu đồ đối chiếu nhiều nhóm cùng lúc.
- Tái dùng `getTeamStats` / `getDepartmentStats`.

### 5. Bộ lọc & tìm kiếm toàn cục
- Lọc theo team/model trên các trang thống kê.
- Ô tìm nhân viên; click chart để drill-down.

---

## 🔵 Chưa làm — Giai đoạn sau (nâng cao)

### 6. Digest định kỳ qua Slack/Email
- Tổng kết ngày/tuần tự động; khớp với hạ tầng telemetry hiện có.
- Có thể chạy bằng cron / Windows Task Scheduler như `sync:amis`.

### 7. Phát hiện bất thường
- Cảnh báo khi token/chi phí của một người tăng vọt so với baseline.

### 8. Presence "đang online" ở Topbar
- Đếm số phiên `ACTIVE` realtime trên mọi trang; tái dùng `liveBus`.

### 9. Cải thiện UX
- Dark-mode toggle (đã có sẵn CSS variables theo theme).
- Skeleton loading, empty states nhất quán.
- Saved views / bộ lọc yêu thích.

---

## Ghi chú kỹ thuật
- Heatmap và bucket theo giờ dùng **giờ local của server**. Nếu server khác múi giờ Nhật, cân nhắc chốt cứng `Asia/Tokyo`.
- Các delta "so kỳ trước" sẽ tự hiển thị khi dữ liệu đủ dài hơn một chu kỳ range.
- Mọi trang đã tự động live nhờ `AutoRefresh`; tính năng mới chỉ cần render Server Component là được cập nhật 5s/lần.
