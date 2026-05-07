import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { getPool } from '../db/pool.js';
import {
  listStatusColorMappings,
  type StatusTone,
} from '../services/statusColorMappings.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requirePermission('admin.users'));

type RoleDto = { id: number; code: string; label: string };

type AdminUserDto = {
  id: number;
  gpid: string;
  displayName: string;
  email: string | null;
  isActive: boolean;
  roles: RoleDto[];
  createdAt: string;
  updatedAt: string;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return '';
}

const patchBodySchema = z
  .object({
    isActive: z.boolean().optional(),
    roleIds: z.array(z.number().int().positive()).optional(),
  })
  .refine((b) => b.isActive !== undefined || b.roleIds !== undefined, {
    message: 'Provide at least one of isActive, roleIds',
  });

const statusToneSchema = z.enum(['green', 'blue', 'red', 'default']);
const upsertStatusColorBody = z.object({
  tone: statusToneSchema,
  label: z.string().trim().max(255).nullable().optional(),
  priority: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional(),
});

const protectedStatusCodes = new Set(['TECO', 'REL']);

adminRouter.get('/roles', async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, code, label FROM roles ORDER BY id ASC`
    );
    const items = (rows as { id: number; code: string; label: string }[]).map((r) => ({
      id: Number(r.id),
      code: r.code,
      label: r.label,
    }));
    res.json({ items, requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/status-color-mappings', async (req, res, next) => {
  try {
    const pool = getPool();
    const items = await listStatusColorMappings(pool);
    res.json({
      items: items.map((x) => ({ ...x, isProtected: protectedStatusCodes.has(x.code) })),
      protectedCodes: [...protectedStatusCodes],
      requestId: req.requestId,
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.put('/status-color-mappings/:code', async (req, res, next) => {
  try {
    const code = String(req.params.code ?? '').toUpperCase().trim();
    if (!/^[A-Z0-9_]{2,32}$/.test(code)) {
      res.status(400).json({
        error: { code: 'INVALID_STATUS_CODE', message: 'code must match ^[A-Z0-9_]{2,32}$' },
        requestId: req.requestId,
      });
      return;
    }
    if (protectedStatusCodes.has(code)) {
      res.status(403).json({
        error: {
          code: 'PROTECTED_STATUS_CODE',
          message: `Cannot modify protected system status code: ${code}`,
        },
        requestId: req.requestId,
      });
      return;
    }
    const body = upsertStatusColorBody.parse(req.body ?? {});
    const pool = getPool();
    await pool.query(
      `INSERT INTO status_color_mappings (code, tone, label, priority, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tone = VALUES(tone),
         label = VALUES(label),
         priority = VALUES(priority),
         is_active = VALUES(is_active)`,
      [
        code,
        body.tone as StatusTone,
        body.label ?? null,
        body.priority ?? 100,
        body.isActive === undefined ? 1 : body.isActive ? 1 : 0,
      ]
    );
    const items = await listStatusColorMappings(pool);
    const item = items.find((x) => x.code === code) ?? null;
    res.json({
      item: item ? { ...item, isProtected: protectedStatusCodes.has(item.code) } : null,
      requestId: req.requestId,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: e.message },
        requestId: req.requestId,
      });
      return;
    }
    next(e);
  }
});

adminRouter.delete('/status-color-mappings/:code', async (req, res, next) => {
  try {
    const code = String(req.params.code ?? '').toUpperCase().trim();
    if (!/^[A-Z0-9_]{2,32}$/.test(code)) {
      res.status(400).json({
        error: { code: 'INVALID_STATUS_CODE', message: 'code must match ^[A-Z0-9_]{2,32}$' },
        requestId: req.requestId,
      });
      return;
    }
    if (protectedStatusCodes.has(code)) {
      res.status(403).json({
        error: {
          code: 'PROTECTED_STATUS_CODE',
          message: `Cannot delete protected system status code: ${code}`,
        },
        requestId: req.requestId,
      });
      return;
    }
    const pool = getPool();
    await pool.query(`DELETE FROM status_color_mappings WHERE code = ?`, [code]);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

adminRouter.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const pool = getPool();

    const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM users`);
    const total = Number((countRows as { cnt: number }[])[0]?.cnt ?? 0);

    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, gpid, display_name, email, is_active, created_at, updated_at
       FROM users
       ORDER BY id ASC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    const users = userRows as {
      id: number;
      gpid: string;
      display_name: string;
      email: string | null;
      is_active: number;
      created_at: unknown;
      updated_at: unknown;
    }[];

    const ids = users.map((u) => u.id);
    const rolesByUser = new Map<number, RoleDto[]>();

    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const [roleRows] = await pool.query<RowDataPacket[]>(
        `SELECT ur.user_id AS user_id, r.id AS role_id, r.code AS code, r.label AS label
         FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id IN (${placeholders})
         ORDER BY r.id ASC`,
        ids
      );
      for (const rr of roleRows as {
        user_id: number;
        role_id: number;
        code: string;
        label: string;
      }[]) {
        const uid = Number(rr.user_id);
        const list = rolesByUser.get(uid) ?? [];
        list.push({
          id: Number(rr.role_id),
          code: rr.code,
          label: rr.label,
        });
        rolesByUser.set(uid, list);
      }
    }

    const items: AdminUserDto[] = users.map((u) => ({
      id: Number(u.id),
      gpid: u.gpid,
      displayName: u.display_name,
      email: u.email,
      isActive: Boolean(Number(u.is_active)),
      roles: rolesByUser.get(Number(u.id)) ?? [],
      createdAt: toIso(u.created_at),
      updatedAt: toIso(u.updated_at),
    }));

    res.json({ items, total, page, pageSize, requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch('/users/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_USER_ID', message: 'user id must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }

    const body = patchBodySchema.parse(req.body);

    const pool = getPool();
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT id, gpid FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const row = (existing as { id: number; gpid: string }[])[0];
    if (!row) {
      res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User does not exist' },
        requestId: req.requestId,
      });
      return;
    }

    if (row.gpid === '__system__') {
      res.status(400).json({
        error: {
          code: 'SYSTEM_USER_PROTECTED',
          message: 'Cannot modify the system user',
        },
        requestId: req.requestId,
      });
      return;
    }

    if (body.roleIds !== undefined) {
      const uniqueIds = [...new Set(body.roleIds)];
      if (uniqueIds.length !== body.roleIds.length) {
        res.status(400).json({
          error: { code: 'DUPLICATE_ROLE_IDS', message: 'roleIds must be unique' },
          requestId: req.requestId,
        });
        return;
      }
      const [roleCheck] =
        uniqueIds.length > 0
          ? await pool.query<RowDataPacket[]>(
              `SELECT id FROM roles WHERE id IN (${uniqueIds.map(() => '?').join(',')})`,
              uniqueIds
            )
          : [[]];
      const found = new Set((roleCheck as { id: number }[]).map((r) => Number(r.id)));
      if (found.size !== uniqueIds.length) {
        res.status(400).json({
          error: { code: 'INVALID_ROLE_IDS', message: 'One or more role ids do not exist' },
          requestId: req.requestId,
        });
        return;
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (body.isActive !== undefined) {
        await conn.execute(`UPDATE users SET is_active = ? WHERE id = ?`, [
          body.isActive ? 1 : 0,
          userId,
        ]);
      }

      if (body.roleIds !== undefined) {
        await conn.execute(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
        for (const rid of body.roleIds) {
          await conn.execute(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [
            userId,
            rid,
          ]);
        }
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    const [userRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, gpid, display_name, email, is_active, created_at, updated_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const rowList = userRows as {
      id: number;
      gpid: string;
      display_name: string;
      email: string | null;
      is_active: number;
      created_at: unknown;
      updated_at: unknown;
    }[];
    const u = rowList[0];
    if (!u) {
      res.status(500).json({
        error: { code: 'INCONSISTENT_STATE', message: 'User row missing after update' },
        requestId: req.requestId,
      });
      return;
    }

    const [roleRows] = await pool.query<RowDataPacket[]>(
      `SELECT r.id AS role_id, r.code AS code, r.label AS label
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ?
       ORDER BY r.id ASC`,
      [userId]
    );

    const roles: RoleDto[] = (roleRows as { role_id: number; code: string; label: string }[]).map(
      (r) => ({
        id: Number(r.role_id),
        code: r.code,
        label: r.label,
      })
    );

    const item: AdminUserDto = {
      id: Number(u.id),
      gpid: u.gpid,
      displayName: u.display_name,
      email: u.email,
      isActive: Boolean(Number(u.is_active)),
      roles,
      createdAt: toIso(u.created_at),
      updatedAt: toIso(u.updated_at),
    };

    res.json({ item, requestId: req.requestId });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: e.message },
        requestId: req.requestId,
      });
      return;
    }
    next(e);
  }
});
