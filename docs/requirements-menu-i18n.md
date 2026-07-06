# Requirement: Cấu trúc menu, phân quyền & đa ngôn ngữ

> Trạng thái: **CHỜ XÁC NHẬN CUỐI**. File này là bản thống nhất giữa yêu cầu của bạn và
> hiện trạng codebase. Bạn có thể sửa trực tiếp trên file. Sau khi bạn duyệt, tôi lập kế
> hoạch triển khai.

## 0. Bối cảnh / hiện trạng

- Sidebar hiện có 15 mục + cây drill-down "Bộ phận / Nhóm" + "Quản trị" (chỉ ADMIN).
- **Chưa có** framework đa ngôn ngữ (chỉ vài chỗ `toLocaleString`).
- **Chưa có** `middleware.ts` — việc chặn truy cập đang rải rác trong từng page.
- Vai trò (DB `Role`): `ADMIN`, `DEPARTMENT_HEAD`, `TEAM_LEAD`, `MEMBER`.

## 1. Menu mặc định (7 mục)

Thứ tự đề xuất (Admin có thể kéo-thả đổi sau):

| # | Menu     | Route          | Ai thấy                         |
|---|----------|----------------|---------------------------------|
| 1 | Tổng quan | `/`            | Mọi người                       |
| 2 | Xếp hạng  | `/rankings`    | Mọi người                       |
| 3 | Model     | `/models`      | Mọi người                       |
| 4 | Thư viện  | `/library`     | Mọi người                       |
| 5 | Phiên trực tuyến | `/live` | Mọi người (dữ liệu theo quyền)  |
| 6 | Tích hợp Claude  | `/integrate` | Mọi người                  |
| 7 | Bộ phận   | `/departments` | **ADMIN + Trưởng bộ phận**      |

- "Quản trị" `/admin` giữ nguyên: chỉ ADMIN, nằm ngoài 7 mục trên.

## 2. Menu ẩn mặc định

Vẫn tồn tại, chỉ ẩn khỏi sidebar cho tới khi Admin bật:

- Cá nhân `/me`
- Công cụ `/tools`
- Áp dụng `/adoption`
- Hiệu quả & Chi phí `/roi`
- Phân tích sâu `/insights`
- Tóm tắt tuần `/summary`
- Thuật ngữ `/glossary`
- Thư viện phiên `/sessions` (đã gộp vào `/live`)

## 3. Bỏ khái niệm "Dự án" và "Nhóm"

- Bỏ menu "Dự án" (`/projects`) khỏi điều hướng.
- Bỏ khái niệm "Nhóm/Team" khỏi điều hướng và cây drill-down cũ trong sidebar.
- Chỉ còn khái niệm **"Bộ phận"** (menu #7).
- **Không** đổi schema DB (Team/teamId vẫn còn trong dữ liệu, chỉ không lộ ra menu).
  Trang `/projects`, `/teams/[id]` để lại trong code nhưng gỡ khỏi menu.

## 4. Menu "Bộ phận" (`/departments`) — menu #7

- Trang xem **xếp hạng tất cả mọi người**, có **bộ lọc theo bộ phận**.
- Phân quyền:
  - `ADMIN`: xem mọi bộ phận + đổi bộ lọc tự do.
  - `DEPARTMENT_HEAD`: chỉ xem bộ phận của mình.
  - Vai trò khác: **bị chặn** (kể cả gõ URL trực tiếp).

## 5. Trang Settings (Admin) — quản lý menu

- Cấu hình **chung cho toàn hệ thống** (không phải theo từng user).
- Mỗi menu đặt được: **Hiện / Ẩn (private)** + (tuỳ chọn) giới hạn theo **vai trò**.
- **Kéo-thả (drag & drop)** đổi thứ tự hiển thị.
- Lưu vào DB → áp dụng cho mọi người, giữ nguyên sau khi tải lại/đăng nhập lại.

## 6. Chặn truy cập URL — `middleware.ts` tập trung

- Thêm `middleware.ts`: nếu menu để **private** hoặc user **không đủ vai trò** →
  gõ URL trực tiếp sẽ bị **redirect / 404**, không chỉ ẩn khỏi sidebar.
- Ví dụ: `MEMBER` gõ `/departments` → bị chặn; user gõ menu đang private → bị chặn.

## 7. Menu "Phiên trực tuyến" (`/live`) — thay cho `/sessions` + `/live`

- Chỉ còn **1 menu duy nhất**: Phiên trực tuyến (`/live`). Bỏ menu "Thư viện phiên" riêng.
- **Trang danh sách dạng bảng**, mỗi dòng = 1 phiên, gồm:
  - **Tìm kiếm** theo tên (người dùng / phiên).
  - **Lọc theo bộ phận**.
  - **Lọc theo ngày / giờ / khoảng thời gian**.
  - **Lọc theo trạng thái**: còn trực tuyến (đang chạy) hay đã kết thúc.
  - **Sắp xếp (sort)** trên từng cột.
- **Bấm vào 1 phiên** → trang chi tiết hiển thị nội dung phiên **đến thời điểm hiện tại**:
  - Phiên đang chạy: cập nhật gần realtime.
  - Phiên đã kết thúc: hiển thị toàn bộ.
  - Tái sử dụng hạ tầng trang chi tiết `/sessions/[id]` sẵn có.

## 8. Đa ngôn ngữ (ja / en / vi)

- Thêm framework i18n (chưa có sẵn) + nút chuyển ngôn ngữ.
- **Dịch toàn bộ UI**: nhãn menu, layout, nội dung trang, nút, thông báo…
- **KHÔNG dịch**: dữ liệu từ DB và dữ liệu từ OTel (tên bộ phận, tên người,
  tên/nội dung phiên, số liệu telemetry) — giữ nguyên.
- Ngôn ngữ mặc định: **vi**. Lưu lựa chọn **theo từng user**.

## 9. Ngoài phạm vi (để tránh hiểu nhầm)

- Không đổi schema DB các model nghiệp vụ (chỉ thêm bảng lưu cấu hình menu + ngôn ngữ user).
- Không xoá các trang bị gỡ khỏi menu (chỉ ẩn khỏi điều hướng).
