// Dump every table to data/export.json (run on the CURRENT DB, e.g. SQLite).
// Pairs with db-import.ts to move data to PostgreSQL. See SCALING.md.
//   npm run db:export
import { prisma } from "../src/lib/db";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

async function main() {
  // Order does not matter for export; import re-inserts in FK-safe order.
  const data = {
    departments: await prisma.department.findMany(),
    users: await prisma.user.findMany(),
    sessions: await prisma.claudeSession.findMany(),
    turns: await prisma.turn.findMany(),
    toolCalls: await prisma.toolCall.findMany(),
    sessionIdentities: await prisma.sessionIdentity.findMany(),
    sessionComments: await prisma.sessionComment.findMany(),
    sessionFeedback: await prisma.sessionFeedback.findMany(),
    libraryItems: await prisma.libraryItem.findMany(),
    libraryComments: await prisma.libraryComment.findMany(),
    libraryReactions: await prisma.libraryReaction.findMany(),
    libraryBookmarks: await prisma.libraryBookmark.findMany(),
  };

  const dir = path.join(process.cwd(), "data");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "export.json"), JSON.stringify(data, null, 2));

  const counts = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length]));
  console.log("Exported to data/export.json:", JSON.stringify(counts));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
