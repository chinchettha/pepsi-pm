import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { getPool } from '../db/pool.js';

const createTaskLogBody = z.object({
  logType: z.string().min(1).max(32).optional(),
});

export const workOrdersRouter = Router();

workOrdersRouter.use(requireAuth);

/** สร้าง task_logs ก่อนอัปโหลดรูปหลักฐาน — `SKIP_AUTH` + user id 0 ใช้ `users.gpid = __system__` เป็น created_by */
workOrdersRouter.post('/:workOrderId/task-logs', requirePermission('work_order.edit'), async (req, res, next) => {
  try {
    const woId = Number(req.params.workOrderId);
    if (!Number.isFinite(woId) || woId <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_WORK_ORDER_ID', message: 'workOrderId must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }

    const parsed = createTaskLogBody.parse(req.body ?? {});
    const logType = parsed.logType ?? 'photo';

    const pool = getPool();
    const [woRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM work_orders WHERE id = ? LIMIT 1',
      [woId]
    );
    if (!Array.isArray(woRows) || woRows.length === 0) {
      res.status(404).json({
        error: { code: 'WORK_ORDER_NOT_FOUND', message: 'Work order does not exist' },
        requestId: req.requestId,
      });
      return;
    }

    let actorId = req.user && req.user.id > 0 ? req.user.id : 0;
    if (!actorId) {
      const [sysRows] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM users WHERE gpid = ? LIMIT 1',
        ['__system__']
      );
      actorId = Number(sysRows[0]?.id);
      if (!actorId) {
        res.status(500).json({
          error: {
            code: 'SYSTEM_USER_MISSING',
            message: 'No __system__ user in DB; cannot attribute task_logs with SKIP_AUTH stub',
          },
          requestId: req.requestId,
        });
        return;
      }
    }

    const [ins] = await pool.query<ResultSetHeader>(
      `INSERT INTO task_logs (work_order_id, log_type, created_by_user_id) VALUES (?, ?, ?)`,
      [woId, logType, actorId]
    );

    res.status(201).json({
      id: String(ins.insertId),
      workOrderId: String(woId),
      logType,
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

workOrdersRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, order_number, order_type, system_status, planned_start, planned_finish
       FROM work_orders
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    const [countRows] = await pool.query('SELECT COUNT(*) AS cnt FROM work_orders');
    const total = Number((countRows as { cnt: number }[])[0]?.cnt ?? 0);
    res.json({ items: rows, total, page, pageSize, requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});

/** รายละเอียดใบงานหนึ่งรายการ — สำหรับหน้า FE รายละเอียด */
workOrdersRouter.get('/:workOrderId', async (req, res, next) => {
  try {
    const id = Number(req.params.workOrderId);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_WORK_ORDER_ID', message: 'workOrderId must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, order_number, order_type, system_status, user_status,
              equipment_id, work_center_planned, work_center_actual,
              planned_start, planned_finish, basic_start, basic_finish,
              last_import_batch_id, created_at, updated_at
       FROM work_orders WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({
        error: { code: 'WORK_ORDER_NOT_FOUND', message: 'Work order does not exist' },
        requestId: req.requestId,
      });
      return;
    }
    res.json({ item: rows[0], requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});
