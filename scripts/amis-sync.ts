import { runAmisSync } from "../src/lib/amis-sync";
import { prisma } from "../src/lib/db";

// Run manually (`npm run sync:amis`) or wire up to a periodic scheduler
// (cron / Windows Task Scheduler) on the server -- see HANDOFF.md.
runAmisSync()
  .then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed.length > 0) process.exitCode = 1;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
