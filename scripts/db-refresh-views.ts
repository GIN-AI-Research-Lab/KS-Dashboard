// Refresh materialized views (chạy định kỳ bằng cron / Task Scheduler ở quy mô lớn).
//   npm run db:refresh-views
import { prisma } from "../src/lib/db";

async function main() {
  await prisma.$executeRawUnsafe("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_usage");
  console.log("Refreshed mv_daily_usage.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
