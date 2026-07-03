# Phân quyền truy cập (KS Dashboard)

Chính sách theo quyết định của công ty (2026-07-03): **minh bạch trong nội bộ** — hầu hết
dữ liệu công khai cho nhân viên đã đăng nhập; chỉ **API key** là riêng tư tuyệt đối và **khu
quản trị** dành cho admin.

## 🔒 Riêng tư — chỉ chính chủ (+ admin cho một số thứ)
- **API key cá nhân**: chỉ hiện ở trang **Cá nhân `/me`** của chính người đó; tạo lại qua `/api/me/regenerate-key`. Không route/trang nào để lộ API key của người khác (đã kiểm tra).
- **Trang `/me`**: view tổng hợp của chính bạn (tiện dụng). *Lưu ý: theo chính sách, người khác vẫn xem được hồ sơ của bạn qua `/users/[id]`.*

## 👥 Mọi nhân viên (đã đăng nhập)
- Tổng quan, Model, Công cụ, Áp dụng, **Phân tích sâu**, **Hiệu quả & Chi phí (tiền)**, Dự án, **Xếp hạng**, Phiên trực tuyến, Thư viện phiên, **Tích hợp Claude**.
- **Hồ sơ người khác** `/users/[id]`, `/teams/[id]`, `/departments/[id]` — gồm phiên, chi phí, huy hiệu, số dòng code.
- **Thư viện** `/library`: bài **PUBLIC** ai cũng thấy; bài **PRIVATE** chỉ tác giả thấy (ở `/library/me`).

## ⚙️ Chỉ admin (role = ADMIN)
- **Trang Quản trị `/admin`**: quản lý bộ phận / nhóm / tài khoản + **Tình trạng thu thập dữ liệu** (email, ai im lặng…). Non-admin bị redirect.
- **Ghi chú nội bộ về nhân viên** (`User.note`) trên `/users/[id]`: chỉ admin xem & sửa.
- **Xuất CSV Ingestion Health** (`/api/export/health`).
- **Mọi API quản trị** (`/api/admin/users|teams|departments`, tạo/sửa/xoá): `requireRole(["ADMIN"])`.

## Cách enforce (nơi kiểm soát)
- **Trang**: `/admin` gọi `auth()` → redirect nếu không phải ADMIN. Ghi chú nội bộ render có điều kiện `isAdmin`.
- **API mutation**: session/library sửa được bởi **chủ sở hữu hoặc admin**; quản trị tổ chức chỉ **admin**.
- **Middleware** `proxy.ts`: mọi trang/API cần đăng nhập, trừ `api/otel/*` (Claude Code gửi telemetry, xác thực bằng `user.email`), `api/ingest`, `api/auth`.
- **API key** chỉ trả về cho chính chủ (`/api/me` dùng `session.user.id`).

## Muốn siết chặt hơn sau này?
Nếu đổi ý (vd chi phí chỉ admin, hoặc hồ sơ người khác chỉ trưởng nhóm xem): thêm kiểm tra role
ở đầu page tương ứng + ẩn cột/thẻ theo `session.user.role`. Có thể thêm tầng **TEAM_LEAD /
DEPARTMENT_HEAD** (chỉ xem người trong nhóm/bộ phận mình) — hiện đã có sẵn các role này trong schema.
