import { applyDecorators } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "./roles.decorator";

export type TimekeepingBusinessRole = "EMPLOYEE" | "MANAGER" | "HR_ADMIN";

export const TIMEKEEPING_ROLE_MAPPING: Record<TimekeepingBusinessRole, UserRole> = {
  EMPLOYEE: UserRole.DRIVER,
  MANAGER: UserRole.OPERATOR,
  HR_ADMIN: UserRole.ADMIN
};

export function TimekeepingOpsRoles() {
  // MANAGER + HR_ADMIN (mapeados para OPERATOR + ADMIN)
  return applyDecorators(Roles(TIMEKEEPING_ROLE_MAPPING.MANAGER, TIMEKEEPING_ROLE_MAPPING.HR_ADMIN));
}

export function TimekeepingReviewRoles() {
  // Somente HR_ADMIN (mapeado para ADMIN)
  return applyDecorators(Roles(TIMEKEEPING_ROLE_MAPPING.HR_ADMIN));
}
