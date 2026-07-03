// Giai đoạn 2 (PostgreSQL only): bật pg_trgm + tạo GIN trigram index cho search
// nhanh, và materialized view rollup theo ngày. Idempotent — chạy lại an toàn.
//   npm run db:phase2
import { prisma } from "../src/lib/db";

const STATEMENTS: string[] = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,

  // Trigram GIN indexes -> ILIKE/contains ("%q%") dùng index thay vì quét bảng.
  `CREATE INDEX IF NOT EXISTS idx_library_title_trgm ON "LibraryItem" USING gin (title gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_library_body_trgm ON "LibraryItem" USING gin (body gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_library_tags_trgm ON "LibraryItem" USING gin (tags gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_user_name_trgm ON "User" USING gin (name gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_user_email_trgm ON "User" USING gin (email gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_session_project_trgm ON "ClaudeSession" USING gin ("projectLabel" gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_session_note_trgm ON "ClaudeSession" USING gin (note gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_session_tags_trgm ON "ClaudeSession" USING gin (tags gin_trgm_ops)`,

  // Company-wide daily usage rollup (dashboard scale-ready). Refresh bằng db:refresh-views.
  `CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_usage AS
     SELECT to_char("createdAt", 'YYYY-MM-DD') AS day,
            sum("inputTokens")::bigint       AS input_tokens,
            sum("outputTokens")::bigint      AS output_tokens,
            sum("costUsd")::double precision AS cost_usd,
            count(*)::bigint                 AS turns
     FROM "Turn"
     GROUP BY 1`,
  // Unique index -> cho phép REFRESH ... CONCURRENTLY.
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_usage_day ON mv_daily_usage (day)`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
    console.log("ok:", sql.split("\n")[0].slice(0, 70));
  }
  console.log("Phase 2 setup xong.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
