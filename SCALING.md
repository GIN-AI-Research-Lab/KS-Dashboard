# Kế hoạch mở rộng: PostgreSQL + tốc độ cho quy mô công ty (~500 người)

Bối cảnh: dữ liệu **gói gọn trong công ty** (hữu hạn, mạng nội bộ) → không cần hệ phân tán.
Mục tiêu: nhanh, nhẹ, ổn định khi hàng trăm phiên ghi telemetry đồng thời + nhiều người xem dashboard.

Nút thắt hiện tại **không phải CPU** mà là: (1) SQLite chỉ 1 writer; (2) nhiều hàm nạp **cả bảng** vào JS rồi tính; (3) auto-refresh 5s chạy lại **toàn bộ** query cho **mỗi tab**.

---

## Giai đoạn 0 — Quick wins (giữ SQLite, rủi ro thấp, làm trước)

Có thể giảm tải lớn mà **chưa cần** đổi DB.

> **Trạng thái:** ✅ **hoàn tất** — WAL+pragmas ([`db.ts`](src/lib/db.ts)); cache TTL 15s ([`cache.ts`](src/lib/cache.ts)) cho **toàn bộ** hàm aggregate công ty (overview, rankings, models, heatmap, tools, sankey, insights, cohort, pivot, projects, cost, adoption, team scorecard, ingestion); `getRankings` + `getModelLeaderboard` chuyển sang `groupBy` (SQL); index composite `Turn(userId,createdAt)` + `ToolCall(sessionId,startedAt)`.
> **Còn lại (vận hành):** chạy production (`next build`+`next start`) sau reverse proxy (brotli/gzip) — bước triển khai, không phải code.

1. **Bật SQLite WAL + pragmas.** Chạy lúc khởi động (raw query trong [`src/lib/db.ts`](src/lib/db.ts)):
   `PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;`
   → đọc và ghi song song, hết lỗi "database is locked" khi ghi nhiều.
2. **Đẩy aggregation xuống SQL.** Refactor các hàm đang `findMany` toàn bảng rồi reduce trong JS → dùng `groupBy` / `aggregate` / `_count`:
   - [`getOverviewStats`](src/lib/stats.ts), `getRankings`, `getModelLeaderboard`, `getActivityHeatmap`, `getInsightsStats`, `getCohortRetention`, `getTeamModelPivot`, `getTeamScorecards`.
   - Đây là thắng lớn nhất khi Turn/ToolCall lên hàng triệu dòng.
3. **Cache aggregate + hạ nhịp auto-refresh.**
   - Bọc các hàm nặng bằng cache TTL ngắn (15–30s). Next 16 có Cache Components: `"use cache"` + `cacheLife({ revalidate: 30 })`, hoặc cache in-memory (Map + TTL) cho deploy 1 instance.
   - [`AutoRefresh`](src/components/AutoRefresh.tsx): hiện `router.refresh()` mỗi 5s chạy lại mọi query cho mỗi viewer. Đổi: trang thống kê refresh **30–60s** (hoặc dựa cache), chỉ phần **live** đẩy qua SSE (`liveBus` đã có). Với N người xem, đây là khoản tiết kiệm nhân theo N.
4. **Chạy production mode.** Trên server dùng `next build` + `next start` (không `next dev` — dev chậm hơn nhiều). Đặt sau reverse proxy (nginx/Caddy) bật gzip/brotli + cache asset tĩnh.
5. **Index composite** khớp truy vấn: `Turn(userId, createdAt)`, `Turn(model, createdAt)`, `ToolCall(sessionId, startedAt)`. (Đã có index đơn; thêm composite cho các filter+sort hay dùng.)
6. **`select` đúng field** — tránh nạp cột thừa; giới hạn `take` mọi nơi.

> Chỉ Giai đoạn 0 đã đủ cho quy mô vừa. Migrate Postgres khi ghi đồng thời thực sự cao hoặc dữ liệu rất lớn.

---

## Giai đoạn 1 — Migrate sang PostgreSQL (local)

> **Trạng thái: ✅ ĐÃ MIGRATE XONG** (2026-07-03). App đang chạy trên PostgreSQL 16.6.
>
> **Cài đặt (user-space, không cần admin — vì WSL đã chiếm 5432, Docker không có):**
> - Binaries: `%LOCALAPPDATA%\ks-postgres\pgsql` · Data cluster: `%LOCALAPPDATA%\ks-postgres\data` · Log: `%LOCALAPPDATA%\ks-postgres\pg.log`
> - Chạy trên **port 5433**, DB `ksdash`, user `ksdash`, auth `trust` (local).
> - `.env`: `DATABASE_URL="postgresql://ksdash@127.0.0.1:5433/ksdash?schema=public"` (dòng SQLite cũ giữ lại, comment, để rollback).
> - Dữ liệu SQLite đã export→import đầy đủ (10 users / 253 turns / 302 tool calls…), verify khớp.
>
> **Vận hành (quan trọng):**
> - **Start** (nếu chưa chạy / sau reboot):
>   `& "$env:LOCALAPPDATA\ks-postgres\pgsql\bin\pg_ctl.exe" -D "$env:LOCALAPPDATA\ks-postgres\data" -o "-p 5433" -l "$env:LOCALAPPDATA\ks-postgres\pg.log" start`
> - **Stop**: cùng lệnh, thay `start` → `stop`.
> - ⚠️ Hiện chạy dạng tiến trình rời (không phải Windows service) → **KHÔNG tự bật lại sau khi reboot máy**. Để tự chạy nền: mở PowerShell **admin** một lần và `pg_ctl register -N ksdash-pg -D <data> -o "-p 5433"` rồi `Start-Service ksdash-pg`.
> - **Rollback về SQLite**: đổi `provider` về `"sqlite"` trong schema + bật lại dòng `DATABASE_URL="file:./dev.db"` (file `dev.db` vẫn còn nguyên) → `prisma generate`.

### Chi tiết kỹ thuật (đã thực hiện)

**Vì sao Postgres:** nhiều writer thật, chịu tải ghi cao; **materialized view** cho rollup nhanh; **pg_trgm** cho tìm kiếm `contains` nhanh; **pgvector** cho tìm ngữ nghĩa prompt/skill — tất cả 1 engine, chạy tốt trên R5 5600 / i5 12400.

### 1.1 Cài đặt
- Postgres 16+ (native trên server, hoặc Docker: `postgres:16`).
- Tạo DB + user riêng cho app; đặt `shared_buffers` ~25% RAM, `work_mem` vừa phải.

### 1.2 Đổi Prisma
- [`prisma/schema.prisma`](prisma/schema.prisma): `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }`.
- Rà soát khác biệt SQLite → Postgres:
  - **Enum**: Postgres có enum thật (Prisma tự map) — OK.
  - **String dài** (`body`, `note`): Postgres map `text` (không giới hạn) — OK, có thể thêm `@db.Text` cho rõ.
  - **Tìm kiếm không phân biệt hoa/thường**: Postgres hỗ trợ `mode: "insensitive"` trong `contains` (SQLite không có) → bật cho library/search.
- **Chuyển từ `db push` sang migration có lịch sử**: `prisma migrate dev` (local) / `prisma migrate deploy` (server). An toàn hơn cho production.
- `.env`: `DATABASE_URL` (pooled) + `DIRECT_URL` (cho migrate) nếu dùng pooler.

### 1.3 Chuyển dữ liệu hiện có
- **Nếu dev.db là dữ liệu vứt được** → khởi tạo mới bằng migrate + seed (đơn giản nhất).
- **Nếu cần giữ**: script Node đọc SQLite (Prisma client cũ) → ghi Postgres (Prisma client mới) theo thứ tự khoá ngoại (User → Team/Dept → Session → Turn/ToolCall → Library…). Hoặc dùng `pgloader`.
- Giữ SQLite tới khi Postgres đã kiểm chứng (rollback dễ).

### 1.4 Kết nối
- Giữ **Prisma singleton** ([`db.ts`](src/lib/db.ts)) — đã có.
- 1 instance Next.js: pool mặc định của Prisma đủ (`connection_limit`).
- Nhiều instance/PM2 cluster → thêm **PgBouncer** (transaction pooling).

### 1.5 Vận hành
- Backup: `pg_dump` theo cron (như `sync:amis`).
- Systemd/Docker restart policy; theo dõi bằng `pg_stat_statements`.

### 1.6 Runbook thực thi (đã chuẩn bị sẵn artifacts)

> Cần có **Postgres đang chạy** — chưa cài trên máy này nên các bước dưới chạy khi bạn đã dựng Postgres.

1. **Dựng Postgres**: `docker compose -f deploy/postgres/docker-compose.yml up -d` (hoặc cài native).
2. **Xuất dữ liệu hiện tại** (đang ở SQLite): `npm run db:export` → `data/export.json`. *(script [`scripts/db-export.ts`](scripts/db-export.ts) — đã kiểm tra chạy được trên SQLite)*
3. **Đổi provider**: trong [`prisma/schema.prisma`](prisma/schema.prisma) đổi `provider = "sqlite"` → `"postgresql"`; đặt `DATABASE_URL="postgresql://ksdash:...@localhost:5432/ksdash?schema=public"` trong `.env`.
4. **Tạo bảng**: `npx prisma migrate dev --name init` (local) hoặc `npx prisma migrate deploy` (server).
5. **Nạp dữ liệu**: `npm run db:import` → đọc `data/export.json`, chèn theo thứ tự khoá ngoại. *(script [`scripts/db-import.ts`](scripts/db-import.ts))*
6. **Kiểm tra** dashboard; giữ `dev.db` cho tới khi yên tâm (rollback = đổi provider về `sqlite`).

Lưu ý: pragmas WAL trong [`db.ts`](src/lib/db.ts) tự bỏ qua trên Postgres (đã bọc try/catch). Cache TTL và aggregate-in-SQL đều dùng chung cho cả hai DB.

---

## Giai đoạn 2 — Tăng tốc sâu (sau khi có Postgres)

> **Trạng thái: ✅ đã làm pg_trgm + materialized view** (2026-07-03). Setup: `npm run db:phase2` ([`scripts/db-phase2-setup.ts`](scripts/db-phase2-setup.ts), idempotent).

1. **✅ pg_trgm + GIN trigram index** trên `LibraryItem(title/body/tags)`, `User(name/email)`, `ClaudeSession(projectLabel/note/tags)` → `contains` (search library, global search, session library) dùng index. Đã bật **tìm kiếm không phân biệt hoa/thường** (`mode:"insensitive"`) trong `getLibraryFeed`, `getSessionLibrary`, `/api/search`.
2. **✅ Materialized view `mv_daily_usage`** (rollup token/chi phí/turns theo ngày) + [`getDailyUsageRollup()`](src/lib/stats.ts) đọc nó (cực nhanh, đọc bảng rollup thay vì quét `Turn`). Refresh: `npm run db:refresh-views` ([`scripts/db-refresh-views.ts`](scripts/db-refresh-views.ts)) — nên đặt cron ở quy mô lớn. *(Hiện dashboard vẫn dùng bản live + cache cho tươi; chuyển sang rollup khi dữ liệu rất lớn.)*
3. **⏳ pgvector (semantic search) — CHƯA kích hoạt được**: extension `vector` **không bundle** sẵn trong bản Postgres này (`pg_available_extensions` không có; thiếu `vector.control`). Để dùng cần: (a) cài **pgvector build cho Windows/PG16** (thả `vector.dll` + `vector.control` + sql vào `pgsql/share/extension` & `lib`, hoặc build bằng MSVC), **và** (b) một **API embedding** để sinh vector (Anthropic không có embeddings — khuyến nghị **Voyage AI**; hoặc OpenAI embeddings). Khi có đủ 2 thứ: `CREATE EXTENSION vector` → thêm cột `embedding vector(1024)` cho `LibraryItem` → ivfflat index → query cosine distance để "tìm prompt/skill tương tự".
4. **Partition** `Turn`/`ToolCall` theo tháng — chỉ khi dữ liệu rất lớn (thường chưa cần ở quy mô công ty).

---

## Next.js "siêu nhanh & nhẹ" — checklist

- **Server Components** giữ JS client tối thiểu (đang làm tốt); client component chỉ ở chart/tương tác.
- **Lazy-load chart nặng** (Recharts) bằng `next/dynamic` để giảm bundle trang không cần chart.
- **Suspense + streaming**: bọc phần dashboard chậm để khung trang hiện ngay, dữ liệu chảy sau.
- **Cache Components (`use cache` + `cacheLife`)** cho aggregate + `revalidateTag` khi ingest → refresh không đập DB.
- **Giảm nhịp auto-refresh** (mục Giai đoạn 0.3) — tác động lớn nhất tới tải.
- **Ingest rẻ**: batch ghi trong transaction, làm ít việc nhất trên đường ghi để không tranh chấp với đọc.
- **Reverse proxy** (nginx/Caddy): brotli/gzip, cache `/_next/static`, HTTP keep-alive.
- **Production build**, không chạy `next dev` trên server.

---

## Lộ trình đề xuất
- **Ngay**: Giai đoạn 0 (WAL + aggregate-in-SQL cho 3–4 trang nặng nhất + cache/giảm auto-refresh + chạy production). → nhanh hơn rõ rệt, rủi ro thấp, chưa cần đổi DB.
- **Khi tải ghi cao / dữ liệu lớn**: Giai đoạn 1 (Postgres + migrate + index).
- **Khi cần**: Giai đoạn 2 (materialized view, pg_trgm, pgvector).
