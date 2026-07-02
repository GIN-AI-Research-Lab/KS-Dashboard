import { randomBytes } from "node:crypto";

export function generateApiKey() {
  return `ksd_${randomBytes(24).toString("hex")}`;
}
