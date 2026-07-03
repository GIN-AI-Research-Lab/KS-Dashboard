import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// SQLite performance: WAL lets readers and a single writer run concurrently and
// persists at the file level once set (so running it once is enough). Best-effort
// and harmless on non-SQLite providers -- run once per process.
const globalForPragma = globalThis as unknown as { sqlitePragmasApplied?: boolean };
const isSqlite = (process.env.DATABASE_URL ?? "").startsWith("file:");
if (isSqlite && !globalForPragma.sqlitePragmasApplied) {
  globalForPragma.sqlitePragmasApplied = true;
  void (async () => {
    // Use $queryRawUnsafe: some PRAGMAs return a row, which $executeRawUnsafe rejects.
    try {
      await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
      await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL;");
      await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000;");
    } catch {
      // non-SQLite provider or read-only FS -- ignore
    }
  })();
}
