import { Spin } from 'antd';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import { useAuth } from '../features/auth/AuthContext';

export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const loc = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" tip="กำลังตรวจสอบสิทธิ์…">
          <div style={{ minHeight: 120, minWidth: 200 }} aria-hidden />
        </Spin>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: loc.pathname }} />;
  }

  return <Outlet />;
}
