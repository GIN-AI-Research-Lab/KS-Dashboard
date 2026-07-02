import { prisma } from "@/lib/db";

// Company domains allowed to sign in / be attributed to a user, e.g. a group
// that operates under two legal-entity email suffixes but treats them as the
// same person as long as the part before "@" matches.
export const ALLOWED_EMAIL_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export function emailLocalPart(email: string): string {
  return email.trim().toLowerCase().split("@")[0] ?? "";
}

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export function isAllowedEmailDomain(email: string): boolean {
  if (ALLOWED_EMAIL_DOMAINS.length === 0) return true; // no allowlist configured -> don't restrict
  return ALLOWED_EMAIL_DOMAINS.includes(emailDomain(email));
}

/** Matches a user by the part of an email before "@", case-insensitively. Also
 * accepts a bare username (no "@") for the Claude Code plugin's identity hint,
 * since it has no domain to check -- callers that need domain enforcement
 * (SSO login) must call isAllowedEmailDomain() themselves first. */
export async function findUserByIdentity(identity: string) {
  return prisma.user.findUnique({ where: { emailLocalPart: emailLocalPart(identity) } });
}
