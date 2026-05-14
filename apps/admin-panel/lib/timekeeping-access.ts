import type { AdminRole, AdminSession } from "./admin-auth";

export type TimekeepingBusinessRole = "EMPLOYEE" | "MANAGER" | "HR_ADMIN";

export const TIMEKEEPING_ROLE_MAPPING: Record<TimekeepingBusinessRole, AdminRole> = {
  EMPLOYEE: "OPERATOR",
  MANAGER: "OPERATOR",
  HR_ADMIN: "ADMIN"
};

export function canOperateTimekeeping(role?: AdminRole): boolean {
  return role === "ADMIN" || role === "OPERATOR";
}

export function canReviewTimekeeping(role?: AdminRole): boolean {
  return role === "ADMIN";
}

export function resolveTimekeepingAccess(session: AdminSession | null | undefined): {
  canOperate: boolean;
  canReview: boolean;
} {
  const role = session?.user.role;
  return {
    canOperate: canOperateTimekeeping(role),
    canReview: canReviewTimekeeping(role)
  };
}
