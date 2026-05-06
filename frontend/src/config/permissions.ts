import type { AuthUser } from '../features/auth/types';

/** สิทธิ์ตาม backend `permissions.code` — สอด docs/SOFTWARE_DESIGN_DOCUMENT ภาคผนวก ช */
export const PERMISSIONS = {
  ADMIN_USERS: 'admin.users',
  IMPORT_RUN: 'import.run',
  WORK_ORDER_EDIT: 'work_order.edit',
  REPORT_DASHBOARD: 'report.dashboard',
} as const;

export function userHasAnyPermission(
  user: AuthUser | null,
  codes: readonly string[]
): boolean {
  if (!user) return false;
  if (user.permissions.includes('*')) return true;
  return codes.some((c) => user.permissions.includes(c));
}
