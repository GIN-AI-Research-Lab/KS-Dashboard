import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function apiKey() {
  return `ksd_${randomBytes(24).toString("hex")}`;
}

const ADMIN_EMAIL = "admin@company.com";

// Idempotent: only ever ensures the admin account exists. Safe to re-run —
// it will never touch or recreate an existing admin (preserves their
// password and API key), and never generates demo departments/teams/usage
// data. Use the Admin panel in the app to add real departments, teams, and
// employees once real Claude Code usage is flowing in via the plugin.
async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Admin account already exists (${ADMIN_EMAIL}) -- nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash("admin1234", 10);
  await prisma.user.create({
    data: {
      name: "Quản trị hệ thống",
      email: ADMIN_EMAIL,
      emailLocalPart: ADMIN_EMAIL.split("@")[0].toLowerCase(),
      passwordHash,
      role: "ADMIN",
      apiKey: apiKey(),
    },
  });

  console.log("Created admin account.");
  console.log(`Login: ${ADMIN_EMAIL} / admin1234`);
  console.log("Get the API key from the \"Cá nhân\" page after logging in.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
