import type { Pool } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

export type AuthUser = {
  id: number;
  gpid: string;
  permissions: string[];
};

export async function loadAuthUser(pool: Pool, userId: number): Promise<AuthUser | null> {
  const [users] = await pool.query<RowDataPacket[]>(
    `SELECT id, gpid, is_active FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  const u = users[0] as { id: number; gpid: string; is_active: number } | undefined;
  if (!u || !Number(u.is_active)) {
    return null;
  }

  const [roles] = await pool.query<RowDataPacket[]>(
    `SELECT r.code AS code
     FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [userId]
  );
  const roleRows = roles as { code: string }[];
  if (roleRows.some((r) => r.code === 'admin')) {
    return { id: u.id, gpid: u.gpid, permissions: ['*'] };
  }

  const [perms] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT p.code AS code
     FROM user_roles ur
     INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
     INNER JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = ?`,
    [userId]
  );

  return {
    id: u.id,
    gpid: u.gpid,
    permissions: (perms as { code: string }[]).map((p) => p.code),
  };
}
