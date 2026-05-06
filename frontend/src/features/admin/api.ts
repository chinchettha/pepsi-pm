import { apiJson } from '../../api/client';

export type AdminRoleRef = {
  id: number;
  code: string;
  label: string;
};

export type AdminUserRow = {
  id: number;
  gpid: string;
  displayName: string;
  email: string | null;
  isActive: boolean;
  roles: AdminRoleRef[];
  createdAt: string;
  updatedAt: string;
};

export type AdminUsersListResponse = {
  items: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  requestId?: string;
};

export function fetchAdminUsers(page = 1, pageSize = 20): Promise<AdminUsersListResponse> {
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return apiJson<AdminUsersListResponse>(`/api/v1/admin/users?${q.toString()}`, {
    method: 'GET',
  });
}

export type AdminRolesResponse = {
  items: AdminRoleRef[];
  requestId?: string;
};

export function fetchAdminRoles(): Promise<AdminRolesResponse> {
  return apiJson<AdminRolesResponse>('/api/v1/admin/roles', { method: 'GET' });
}

export type PatchAdminUserBody = {
  isActive?: boolean;
  roleIds?: number[];
};

export type PatchAdminUserResponse = {
  item: AdminUserRow;
  requestId?: string;
};

export function patchAdminUser(userId: number, body: PatchAdminUserBody): Promise<PatchAdminUserResponse> {
  return apiJson<PatchAdminUserResponse>(`/api/v1/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
