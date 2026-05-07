import { PERMISSIONS, userHasAnyPermission } from '../../config/permissions';
import { ROUTES } from '../../config/routes';
import type { AuthUser } from '../../features/auth/types';

/** key = path ที่ใช้เป็น selectedKeys + navigate */
export function getSelectedNavKey(pathname: string): string {
  if (pathname.startsWith('/admin')) return ROUTES.admin.users;
  if (pathname.startsWith(ROUTES.workOrders.calendar)) return ROUTES.workOrders.calendar;
  if (pathname.startsWith(ROUTES.workOrders.dailyAssignmentReport))
    return ROUTES.workOrders.dailyAssignmentReport;
  if (pathname.startsWith(ROUTES.workOrders.list)) return ROUTES.workOrders.list;
  if (pathname.startsWith(ROUTES.import)) return ROUTES.import;
  if (pathname.startsWith('/jobs')) return ROUTES.jobs.hub;
  if (pathname.startsWith(ROUTES.reportsKpi)) return ROUTES.reportsKpi;
  if (pathname.startsWith(ROUTES.sapReports)) return ROUTES.sapReports;
  if (pathname.startsWith(ROUTES.dashboard)) return ROUTES.dashboard;
  if (pathname.startsWith(ROUTES.evidence)) return ROUTES.evidence;
  return ROUTES.home;
}

export function canAccessAdminNav(user: AuthUser | null): boolean {
  return userHasAnyPermission(user, [PERMISSIONS.ADMIN_USERS]);
}
