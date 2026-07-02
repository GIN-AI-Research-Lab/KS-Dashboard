import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  role: Role;
  teamId: string | null;
  departmentId: string | null;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Quản trị viên",
  DEPARTMENT_HEAD: "Trưởng bộ phận",
  TEAM_LEAD: "Trưởng nhóm",
  MEMBER: "Thành viên",
};

export function isAdmin(user: SessionUser) {
  return user.role === "ADMIN";
}

export function canManageOrg(user: SessionUser) {
  return user.role === "ADMIN";
}
