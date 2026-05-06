import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { AppLocationState } from '../config/navigationState';
import { errorRoute, ROUTES } from '../config/routes';
import { userHasAnyPermission } from '../config/permissions';
import { useAuth } from '../features/auth/AuthContext';

type Props = {
  /** ต้องมีอย่างน้อยหนึ่งรหัส — หรือ role admin (`*` จาก `/auth/me`) */
  anyOf: readonly string[];
  children: ReactNode;
  /** เมื่อไม่มีสิทธิ์ (ค่าเริ่มต้น = `/error/403`) */
  fallbackTo?: string;
};

export function PermissionGate({ anyOf, children, fallbackTo }: Props) {
  const { user } = useAuth();
  const location = useLocation();
  const denyTarget = fallbackTo ?? errorRoute('403');

  if (!user) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (!userHasAnyPermission(user, anyOf)) {
    return (
      <Navigate
        to={denyTarget}
        replace
        state={
          {
            accessDenied: true,
            deniedPath: location.pathname,
          } satisfies AppLocationState
        }
      />
    );
  }

  return children;
}
