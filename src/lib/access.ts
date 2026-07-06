import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  role: Role;
  departmentId: string | null;
}

export function isAdmin(user: SessionUser) {
  return user.role === "ADMIN";
}

export function canManageOrg(user: SessionUser) {
  return user.role === "ADMIN";
}
