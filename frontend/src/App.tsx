import { lazy, Suspense } from 'react';
import { App as AntApp, ConfigProvider, Spin } from 'antd';
import thTH from 'antd/locale/th_TH';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppErrorBoundary } from './features/errors/AppErrorBoundary';
import { ErrorPage } from './features/errors/ErrorPage';
import { AppShellLayout } from './components/layout/AppShellLayout';
import { AuthProvider } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/pages/LoginPage';
import { HomePage } from './features/home/pages/HomePage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { DataImportPage } from './features/data-import/pages/DataImportPage';
import { EvidenceUploadPage } from './features/evidence/pages/EvidenceUploadPage';
import { JobStatusPage } from './features/jobs/pages/JobStatusPage';
import { WorkOrdersPage } from './features/work-orders/pages/WorkOrdersPage';
import { WorkOrderDetailPage } from './features/work-orders/pages/WorkOrderDetailPage';
import { SapReportsPage } from './features/sap/pages/SapReportsPage';
import { PERMISSIONS } from './config/permissions';
import { errorRoute, ROUTES, ROUTE_SEGMENTS } from './config/routes';
import { AdminUsersPage } from './features/admin/pages/AdminUsersPage';
import { WorkCalendarPlaceholderPage } from './features/work-orders/pages/WorkCalendarPlaceholderPage';
import { JobsHubPlaceholderPage } from './features/jobs/pages/JobsHubPlaceholderPage';
import { PermissionGate } from './routes/PermissionGate';
import { RequireAuth } from './routes/RequireAuth';
import './styles/global.css';

const ReportsKpiPage = lazy(() =>
  import('./features/reports/kpi/ReportsKpiPage').then((m) => ({ default: m.ReportsKpiPage }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={thTH}>
        <AntApp>
          <AuthProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AppErrorBoundary>
              <Routes>
                <Route path={ROUTES.errorSegment} element={<ErrorPage />} />
                <Route path={ROUTES.login} element={<LoginPage />} />
                <Route element={<RequireAuth />}>
                  <Route element={<AppShellLayout />}>
                    <Route path={ROUTES.home} element={<HomePage />} />
                    <Route path={ROUTES.workOrders.list} element={<WorkOrdersPage />} />
                    <Route path={ROUTES.workOrders.calendar} element={<WorkCalendarPlaceholderPage />} />
                    <Route path={ROUTE_SEGMENTS.workOrderDetail} element={<WorkOrderDetailPage />} />
                    <Route path={ROUTES.import} element={<DataImportPage />} />
                    <Route path={ROUTES.dashboard} element={<DashboardPage />} />
                    <Route
                      path={ROUTES.reportsKpi}
                      element={
                        <Suspense
                          fallback={
                            <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
                          }
                        >
                          <ReportsKpiPage />
                        </Suspense>
                      }
                    />
                    <Route path={ROUTES.sapReports} element={<SapReportsPage />} />
                    <Route path={ROUTES.evidence} element={<EvidenceUploadPage />} />
                    <Route path={ROUTES.jobs.hub} element={<JobsHubPlaceholderPage />} />
                    <Route path={ROUTE_SEGMENTS.jobDetail} element={<JobStatusPage />} />
                    <Route
                      path={ROUTES.admin.users}
                      element={
                        <PermissionGate anyOf={[PERMISSIONS.ADMIN_USERS]}>
                          <AdminUsersPage />
                        </PermissionGate>
                      }
                    />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to={errorRoute('404')} replace />} />
              </Routes>
              </AppErrorBoundary>
            </BrowserRouter>
          </AuthProvider>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
