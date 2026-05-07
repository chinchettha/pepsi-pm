/**
 * Path คงที่ของแอป — ใช้แทนสตริงกระจายใน Link / navigate / Route
 */
export const ROUTES = {
  login: '/login',
  home: '/',
  workOrders: {
    list: '/work-orders',
    calendar: '/work-orders/calendar',
    rescheduleHistory: '/work-orders/reschedule-history',
    detail: (workOrderId: string | number) =>
      `/work-orders/${encodeURIComponent(String(workOrderId))}`,
  },
  import: '/data/import',
  dashboard: '/dashboard',
  reportsKpi: '/reports/kpi',
  sapReports: '/sap-reports',
  evidence: '/evidence',
  jobs: {
    hub: '/jobs',
    detail: (jobId: string | number) => `/jobs/${encodeURIComponent(String(jobId))}`,
  },
  admin: {
    users: '/admin/users',
  },
  /** path สำหรับ `<Route path={…}>` */
  errorSegment: '/error/:code',
} as const;

/** ลิงก์ไปหน้าแสดงข้อผิดพลาด เช่น `/error/403` */
export function errorRoute(code: string): string {
  return `/error/${encodeURIComponent(code)}`;
}

/** ลิงก์ไปหน้าหลักฐานพร้อม query workOrderId */
export function evidenceWithWorkOrder(workOrderId: string | number): string {
  return `${ROUTES.evidence}?workOrderId=${encodeURIComponent(String(workOrderId))}`;
}

/** pattern สำหรับ `<Route path={…}>` — ไม่ใช่ URL จริง */
export const ROUTE_SEGMENTS = {
  workOrderDetail: '/work-orders/:workOrderId',
  jobDetail: '/jobs/:jobId',
} as const;
