# Quyền riêng tư dữ liệu (KS Dashboard)

Nguyên tắc: app **chỉ lưu metadata & thống kê**, tuyệt đối **không lưu nội dung** cuộc làm việc
với Claude.

## ❌ KHÔNG thu thập / KHÔNG lưu
- **Nội dung prompt** người dùng gõ.
- **Nội dung hội thoại / phản hồi của model** (input/output text).
- **Nội dung file, đoạn code, diff** (kể cả `old_string`/`new_string` của Edit).
- **Lệnh Bash, đường dẫn file cụ thể, pattern tìm kiếm, URL** trong tool input.

> Trước đây trường `ToolCall.summary` có thể chứa các thứ trên (lệnh/đường dẫn/diff cắt ngắn) —
> đã **gỡ bỏ hoàn toàn**: khỏi plugin (`ingest.js` không còn `summarizeToolInput`), khỏi API
> (`/api/ingest`, `ingest-schema`), và **xoá cột `summary` khỏi DB** (kèm dữ liệu cũ).

## ✅ CÓ lưu (metadata / thống kê / do người dùng chủ động)
- **Số liệu**: đếm token (in/out/cache), chi phí, số turn/tool/prompt, thời lượng, model, stopReason, TTFT/latency.
- **Tool**: tên tool + trạng thái (thành công/lỗi) + thời lượng — **không kèm nội dung**.
- **Chấp nhận/từ chối sửa, số lỗi API, số dòng code thêm/xoá** — chỉ là **con số** (không phải code).
- **Dự án**: **chỉ tên thư mục cuối** (project label) để nhóm theo dự án — **KHÔNG** lưu full path `cwd`. Plugin tự cắt tên thư mục tại máy trước khi gửi; cột `cwd` đã bị xoá khỏi DB.
- **Do người dùng chủ động đăng**: bài Thư viện (prompt/skill họ tự viết), bình luận, ghi chú phiên, ảnh upload. Đây là hành động cố ý, không phải tự động bắt.

## 🛡️ Phòng vệ kỹ thuật
- **`OTEL_LOG_USER_PROMPTS=0`** đặt sẵn trong script setup → Claude Code không export nội dung prompt dù bật telemetry.
- **OTel receiver là whitelist**: chỉ đọc đúng các thuộc tính đã liệt kê (token/cost/tool_name/status/duration/decision/lines), bỏ qua mọi thuộc tính khác — kể cả nếu Claude Code có gửi thêm.
- Endpoint telemetry (`/api/otel/*`, `/api/ingest`) chỉ nhận vào DB **nội bộ**; không gửi đi đâu bên ngoài.

## Đã siết
- ✅ **Full path `cwd` đã bị loại bỏ** — plugin chỉ gửi tên thư mục cuối; schema `ingest` không nhận `cwd`; cột `ClaudeSession.cwd` đã xoá khỏi DB.
- ✅ **`ToolCall.summary` đã bị loại bỏ** — không còn lưu lệnh/đường dẫn/diff/nội dung.
