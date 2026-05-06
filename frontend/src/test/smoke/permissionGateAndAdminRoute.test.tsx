import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import thTH from 'antd/locale/th_TH';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../config/permissions';
import { ROUTES } from '../../config/routes';
import { AdminUsersPage } from '../../features/admin/pages/AdminUsersPage';
import type { AuthUser } from '../../features/auth/types';
import { PermissionGate } from '../../routes/PermissionGate';

const authState = vi.hoisted(() => ({
  user: null as AuthUser | null,
}));

vi.mock('../../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    isLoading: false,
    isAuthenticated: authState.user !== null,
    authSessionError: null,
    logout: vi.fn(),
    setAccessToken: vi.fn(),
    refetchSession: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../../features/admin/api', () => ({
  fetchAdminUsers: vi.fn(() =>
    Promise.resolve({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })
  ),
  fetchAdminRoles: vi.fn(() => Promise.resolve({ items: [] })),
  patchAdminUser: vi.fn(),
}));

function renderGateFixture() {
  return render(
    <MemoryRouter initialEntries={[ROUTES.admin.users]}>
      <Routes>
        <Route path={ROUTES.login} element={<div data-testid="login-page">Login</div>} />
        <Route path={ROUTES.home} element={<div data-testid="home-page">Home</div>} />
        <Route
          path={ROUTES.errorSegment}
          element={<div data-testid="error-page">Error</div>}
        />
        <Route
          path={ROUTES.admin.users}
          element={
            <PermissionGate anyOf={[PERMISSIONS.ADMIN_USERS]}>
              <div data-testid="admin-allowed">Allowed</div>
            </PermissionGate>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

function renderAdminUsersRoute() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ConfigProvider locale={thTH}>
        <AntApp>
          <MemoryRouter initialEntries={[ROUTES.admin.users]}>
            <Routes>
              <Route
                path={ROUTES.admin.users}
                element={
                  <PermissionGate anyOf={[PERMISSIONS.ADMIN_USERS]}>
                    <AdminUsersPage />
                  </PermissionGate>
                }
              />
            </Routes>
          </MemoryRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

describe('PermissionGate', () => {
  beforeEach(() => {
    authState.user = null;
  });

  it('redirects to login when there is no session', () => {
    authState.user = null;
    renderGateFixture();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('redirects to error 403 when the user lacks admin.users', async () => {
    authState.user = {
      id: 2,
      gpid: 'planner1',
      permissions: ['import.run'],
    };
    renderGateFixture();
    await waitFor(() => {
      expect(screen.getByTestId('error-page')).toBeInTheDocument();
    });
  });

  it('renders children when the user has admin.users', () => {
    authState.user = {
      id: 3,
      gpid: 'adminish',
      permissions: ['admin.users'],
    };
    renderGateFixture();
    expect(screen.getByTestId('admin-allowed')).toBeInTheDocument();
  });

  it('renders children when permissions include *', () => {
    authState.user = {
      id: 4,
      gpid: 'super',
      permissions: ['*'],
    };
    renderGateFixture();
    expect(screen.getByTestId('admin-allowed')).toBeInTheDocument();
  });
});

describe('route /admin/users', () => {
  beforeEach(() => {
    authState.user = null;
  });

  it('shows AdminUsersPage title when authorized (smoke)', async () => {
    authState.user = {
      id: 5,
      gpid: 'admin_user',
      permissions: ['admin.users'],
    };
    renderAdminUsersRoute();
    await waitFor(() => {
      expect(screen.getByText('จัดการผู้ใช้และบทบาท')).toBeInTheDocument();
    });
  });
});
