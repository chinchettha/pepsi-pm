import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Pool } from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { getPool } from '../db/pool.js';
import {
  calendarBlockTone,
  canRescheduleWorkOrderOnCalendar,
  rescheduleRequiresReasonCode,
} from '../services/calendarRescheduleRules.js';
import { listStatusColorMappings } from '../services/statusColorMappings.js';

const createTaskLogBody = z.object({
  logType: z.string().min(1).max(32).optional(),
});

const createConfirmationBody = z.object({
  actualStart: z.union([z.string(), z.null()]).optional(),
  actualFinish: z.union([z.string(), z.null()]).optional(),
  actualWorkHours: z.union([z.number(), z.null()]).optional(),
  reasonCodeId: z.union([z.number().int().positive(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
  syncToSapStatus: z.enum(['pending', 'not_applicable']).optional(),
});

const rescheduleBody = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reasonCode: z.union([z.string(), z.null()]).optional(),
  comment: z.union([z.string(), z.null()]).optional(),
});
const planningBody = z.object({
  workCenterPlanned: z.union([z.string().max(64), z.null()]).optional(),
  assignedPerson: z.union([z.string().max(128), z.null()]).optional(),
  priority: z.union([z.string().max(64), z.null()]).optional(),
  plannedStart: z.string(),
  plannedFinish: z.string(),
});
const closeWorkOrderBody = z.object({
  workCenterActual: z.union([z.string().max(128), z.null()]).optional(),
  /** When non-empty, inserts one order_confirmation per worker (same times/hours). */
  workCentersActual: z.array(z.string().trim().min(1).max(128)).max(50).optional(),
  actualStart: z.string(),
  actualFinish: z.string(),
  actualWorkHours: z.union([z.number(), z.null()]).optional(),
  comment: z.union([z.string().max(500), z.null()]).optional(),
});

function buildCloseConfirmationNotes(workerLabel: string, comment: string | null | undefined): string {
  const prefix = `Actual: ${workerLabel}`;
  const c = comment?.trim();
  return c ? `${prefix}\n${c}` : prefix;
}
const calendarFilterConfigBody = z.object({
  role: z.enum(['admin', 'planner']),
  functionalLocations: z.array(z.string().trim().min(1).max(255)).max(500),
  statuses: z.array(z.string().trim().min(1).max(255)).max(500),
  assignedResources: z.array(z.string().trim().min(1).max(255)).max(500),
  workOrderTypes: z.array(z.string().trim().min(1).max(255)).max(500),
  priorities: z.array(z.string().trim().min(1).max(255)).max(500),
});

const STANDARD_RESCHEDULE_REASONS = new Set(['01', '02', '03', '04', '05']);

function hasAnyPermission(permissions: string[], anyOf: string[]): boolean {
  if (permissions.includes('*')) return true;
  return anyOf.some((x) => permissions.includes(x));
}

async function ensureCalendarFilterConfigsTable(pool: Pool): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS calendar_filter_configs (
       role_key VARCHAR(32) NOT NULL COMMENT 'admin|planner',
       config_json JSON NOT NULL,
       updated_by_user_id BIGINT UNSIGNED NULL,
       created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
       updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
       PRIMARY KEY (role_key),
       CONSTRAINT chk_calendar_filter_role CHECK (role_key IN ('admin', 'planner')),
       CONSTRAINT fk_calendar_filter_updated_by
         FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
         ON UPDATE RESTRICT ON DELETE SET NULL
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
     COMMENT='Shared filter menu customization for calendar by role'`
  );
}

function tryParseDateTime(input: unknown): { value: Date | null; invalid: boolean } {
  if (input === undefined || input === null) return { value: null, invalid: false };
  if (typeof input === 'string' && input.trim() === '') return { value: null, invalid: false };
  if (typeof input !== 'string') return { value: null, invalid: true };
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return { value: null, invalid: true };
  return { value: d, invalid: false };
}

function toMysqlDateTime(d: Date): string {
  return d.toISOString().slice(0, 23).replace('T', ' ');
}

async function resolveActorUserId(pool: Pool, reqUserId: number): Promise<number | null> {
  if (reqUserId > 0) return reqUserId;
  const [sysRows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM users WHERE gpid = ? LIMIT 1',
    ['__system__']
  );
  const id = Number(sysRows[0]?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

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

workOrdersRouter.post('/:workOrderId/reschedule', requirePermission('work_order.edit'), async (req, res, next) => {
  try {
    const woId = Number(req.params.workOrderId);
    if (!Number.isFinite(woId) || woId <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_WORK_ORDER_ID', message: 'workOrderId must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }

    const body = rescheduleBody.parse(req.body ?? {});
    const reasonCode = body.reasonCode?.trim() || null;
    const comment = body.comment?.trim() || null;
    if (reasonCode && !STANDARD_RESCHEDULE_REASONS.has(reasonCode)) {
      res.status(400).json({
        error: { code: 'INVALID_REASON_CODE', message: 'reasonCode must be one of 01,02,03,04,05' },
        requestId: req.requestId,
      });
      return;
    }

    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, system_status, planned_start, planned_finish, order_number, ui_metadata_json
       FROM work_orders WHERE id = ? LIMIT 1`,
      [woId]
    );
    const wo = rows[0] as
      | {
          id: number;
          system_status: string | null;
          planned_start: Date | null;
          planned_finish: Date | null;
          order_number: string | null;
          ui_metadata_json: unknown;
        }
      | undefined;
    if (!wo) {
      res.status(404).json({
        error: { code: 'WORK_ORDER_NOT_FOUND', message: 'Work order does not exist' },
        requestId: req.requestId,
      });
      return;
    }

    const calendarTone = calendarBlockTone({
      system_status: wo.system_status,
      order_number: wo.order_number,
      ui_metadata_json: wo.ui_metadata_json,
    });
    if (
      !canRescheduleWorkOrderOnCalendar({
        system_status: wo.system_status,
        order_number: wo.order_number,
        ui_metadata_json: wo.ui_metadata_json,
      })
    ) {
      res.status(400).json({
        error: {
          code: 'WORK_ORDER_NOT_RESCHEDULABLE',
          message:
            'Calendar reschedule allowed only for red work orders, or blue estimates that include a Call no. in metadata',
        },
        requestId: req.requestId,
      });
      return;
    }
    if (rescheduleRequiresReasonCode(calendarTone) && !reasonCode) {
      res.status(400).json({
        error: {
          code: 'REASON_REQUIRED',
          message: 'Reason Code is required for this work order type',
        },
        requestId: req.requestId,
      });
      return;
    }

    const target = new Date(`${body.targetDate}T00:00:00.000`);
    const srcStart = wo.planned_start ? new Date(wo.planned_start) : null;
    const srcFinish = wo.planned_finish ? new Date(wo.planned_finish) : null;

    const newStart = new Date(target);
    if (srcStart) {
      newStart.setHours(srcStart.getHours(), srcStart.getMinutes(), srcStart.getSeconds(), srcStart.getMilliseconds());
    } else {
      newStart.setHours(8, 0, 0, 0);
    }

    let newFinish = new Date(newStart);
    if (srcStart && srcFinish && srcFinish.getTime() > srcStart.getTime()) {
      const durationMs = srcFinish.getTime() - srcStart.getTime();
      newFinish = new Date(newStart.getTime() + durationMs);
    } else if (srcFinish) {
      newFinish.setHours(srcFinish.getHours(), srcFinish.getMinutes(), srcFinish.getSeconds(), srcFinish.getMilliseconds());
      if (newFinish.getTime() <= newStart.getTime()) {
        newFinish = new Date(newStart.getTime() + 3_600_000);
      }
    } else {
      newFinish = new Date(newStart.getTime() + 3_600_000);
    }

    const actorId = req.user && req.user.id > 0 ? req.user.id : null;
    await pool.query(
      `UPDATE work_orders
       SET planned_start = ?, planned_finish = ?
       WHERE id = ?`,
      [toMysqlDateTime(newStart), toMysqlDateTime(newFinish), woId]
    );
    await pool.query(
      `INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, payload_json)
       VALUES ('work_order', ?, 'reschedule', ?, CAST(? AS JSON))`,
      [
        String(woId),
        actorId,
        JSON.stringify({
          from: {
            planned_start: srcStart ? toMysqlDateTime(srcStart) : null,
            planned_finish: srcFinish ? toMysqlDateTime(srcFinish) : null,
          },
          to: {
            planned_start: toMysqlDateTime(newStart),
            planned_finish: toMysqlDateTime(newFinish),
          },
          reasonCode,
          comment,
          calendarTone,
        }),
      ]
    );

    res.json({
      item: {
        workOrderId: String(woId),
        plannedStart: toMysqlDateTime(newStart),
        plannedFinish: toMysqlDateTime(newFinish),
        reasonCode,
        comment,
        calendarTone,
      },
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

workOrdersRouter.post('/:workOrderId/planning', requirePermission('work_order.edit'), async (req, res, next) => {
  try {
    const woId = Number(req.params.workOrderId);
    if (!Number.isFinite(woId) || woId <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_WORK_ORDER_ID', message: 'workOrderId must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }
    const body = planningBody.parse(req.body ?? {});
    const start = tryParseDateTime(body.plannedStart);
    const finish = tryParseDateTime(body.plannedFinish);
    if (start.invalid || finish.invalid || !start.value || !finish.value || finish.value <= start.value) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'plannedStart/plannedFinish invalid or finish <= start' },
        requestId: req.requestId,
      });
      return;
    }
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, ui_metadata_json FROM work_orders WHERE id = ? LIMIT 1`,
      [woId]
    );
    const wo = rows[0] as { id: number; ui_metadata_json: unknown } | undefined;
    if (!wo) {
      res.status(404).json({
        error: { code: 'WORK_ORDER_NOT_FOUND', message: 'Work order does not exist' },
        requestId: req.requestId,
      });
      return;
    }
    const metadata =
      typeof wo.ui_metadata_json === 'string'
        ? (JSON.parse(wo.ui_metadata_json) as Record<string, unknown>)
        : ((wo.ui_metadata_json as Record<string, unknown>) ?? {});
    const nextMeta = {
      ...metadata,
      planning: {
        ...(typeof metadata.planning === 'object' && metadata.planning ? (metadata.planning as Record<string, unknown>) : {}),
        priority: body.priority ?? null,
        assignedPerson: body.assignedPerson ?? null,
      },
    };
    await pool.query(
      `UPDATE work_orders
       SET work_center_planned = ?, planned_start = ?, planned_finish = ?, ui_metadata_json = CAST(? AS JSON)
       WHERE id = ?`,
      [
        body.workCenterPlanned ?? null,
        toMysqlDateTime(start.value),
        toMysqlDateTime(finish.value),
        JSON.stringify(nextMeta),
        woId,
      ]
    );
    res.json({
      item: {
        workOrderId: String(woId),
        workCenterPlanned: body.workCenterPlanned ?? null,
        priority: body.priority ?? null,
        assignedPerson: body.assignedPerson ?? null,
        plannedStart: toMysqlDateTime(start.value),
        plannedFinish: toMysqlDateTime(finish.value),
      },
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

workOrdersRouter.post('/:workOrderId/close-work-order', requirePermission('work_order.edit'), async (req, res, next) => {
  try {
    const woId = Number(req.params.workOrderId);
    if (!Number.isFinite(woId) || woId <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_WORK_ORDER_ID', message: 'workOrderId must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }
    const body = closeWorkOrderBody.parse(req.body ?? {});
    const start = tryParseDateTime(body.actualStart);
    const finish = tryParseDateTime(body.actualFinish);
    if (start.invalid || finish.invalid || !start.value || !finish.value || finish.value <= start.value) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'actualStart/actualFinish invalid or finish <= start' },
        requestId: req.requestId,
      });
      return;
    }
    const pool = getPool();
    const [woRows] = await pool.query<RowDataPacket[]>('SELECT id FROM work_orders WHERE id = ? LIMIT 1', [woId]);
    if (!woRows[0]) {
      res.status(404).json({
        error: { code: 'WORK_ORDER_NOT_FOUND', message: 'Work order does not exist' },
        requestId: req.requestId,
      });
      return;
    }
    const actorId = await resolveActorUserId(pool, req.user && req.user.id > 0 ? req.user.id : 0);
    const computedHours = (finish.value.getTime() - start.value.getTime()) / 3_600_000;
    const actualHours =
      body.actualWorkHours !== undefined && body.actualWorkHours !== null ? Number(body.actualWorkHours) : computedHours;

    const rawCenters =
      body.workCentersActual && body.workCentersActual.length > 0
        ? body.workCentersActual
        : body.workCenterActual != null && String(body.workCenterActual).trim() !== ''
          ? [String(body.workCenterActual).trim()]
          : [];
    if (rawCenters.length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Provide workCentersActual (non-empty) or workCenterActual',
        },
        requestId: req.requestId,
      });
      return;
    }
    const workers = [...new Set(rawCenters.map((s) => s.trim()).filter(Boolean))];
    const joinedCenters = workers.join(', ');
    if (joinedCenters.length > 512) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Combined actual worker labels exceed 512 characters',
        },
        requestId: req.requestId,
      });
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`UPDATE work_orders SET work_center_actual = ? WHERE id = ?`, [joinedCenters, woId]);
      for (const wLabel of workers) {
        const sapLineKey = `close|${woId}|${randomUUID()}`.slice(0, 192);
        await conn.query(
          `INSERT INTO order_confirmations (
             work_order_id, import_batch_id, stg_confirm_row_id, sap_confirm_no, sap_counter, sap_line_key,
             confirmed_by_user_id, actual_start, actual_finish, actual_work_hours, notes, sync_to_sap_status
           ) VALUES (?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, 'not_applicable')`,
          [
            woId,
            sapLineKey,
            actorId,
            toMysqlDateTime(start.value),
            toMysqlDateTime(finish.value),
            actualHours,
            buildCloseConfirmationNotes(wLabel, body.comment),
          ]
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.json({
      item: {
        workOrderId: String(woId),
        workCenterActual: joinedCenters,
        actualStart: toMysqlDateTime(start.value),
        actualFinish: toMysqlDateTime(finish.value),
        actualWorkHours: actualHours,
        confirmationRowsCreated: workers.length,
      },
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

/** Mapping สีสถานะ SAP สำหรับปฏิทิน/บล็อคงาน (read-only สำหรับผู้ใช้ที่ login แล้ว) */
workOrdersRouter.get('/status-color-mappings', async (req, res, next) => {
  try {
    const pool = getPool();
    const items = await listStatusColorMappings(pool);
    res.json({ items, requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});

workOrdersRouter.get('/calendar-filter-config', async (req, res, next) => {
  try {
    const userPermissions = req.user?.permissions ?? [];
    if (!hasAnyPermission(userPermissions, ['admin.users', 'work_order.edit'])) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Permission denied' },
        requestId: req.requestId,
      });
      return;
    }
    const role = req.query.role === 'admin' ? 'admin' : 'planner';
    if (role === 'admin' && !hasAnyPermission(userPermissions, ['admin.users'])) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only admin can read admin config' },
        requestId: req.requestId,
      });
      return;
    }
    const pool = getPool();
    await ensureCalendarFilterConfigsTable(pool);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.role_key, c.config_json, c.updated_at, u.display_name AS updated_by_name, u.gpid AS updated_by_gpid
       FROM calendar_filter_configs
       c
       LEFT JOIN users u ON u.id = c.updated_by_user_id
       WHERE c.role_key = ?
       LIMIT 1`,
      [role]
    );
    const row = rows[0] as
      | {
          role_key: string;
          config_json: unknown;
          updated_at: Date | string | null;
          updated_by_name: string | null;
          updated_by_gpid: string | null;
        }
      | undefined;
    const emptyConfig = {
      role,
      functionalLocations: [],
      statuses: [],
      assignedResources: [],
      workOrderTypes: [],
      priorities: [],
      updatedAt: null,
      updatedBy: null,
    };
    if (!row) {
      res.json({ item: emptyConfig, requestId: req.requestId });
      return;
    }
    const parsed =
      typeof row.config_json === 'string'
        ? (JSON.parse(row.config_json) as Record<string, unknown>)
        : ((row.config_json as Record<string, unknown>) ?? {});
    res.json({
      item: {
        role,
        functionalLocations: Array.isArray(parsed.functionalLocations) ? parsed.functionalLocations : [],
        statuses: Array.isArray(parsed.statuses) ? parsed.statuses : [],
        assignedResources: Array.isArray(parsed.assignedResources) ? parsed.assignedResources : [],
        workOrderTypes: Array.isArray(parsed.workOrderTypes) ? parsed.workOrderTypes : [],
        priorities: Array.isArray(parsed.priorities) ? parsed.priorities : [],
        updatedAt: row.updated_at
          ? row.updated_at instanceof Date
            ? row.updated_at.toISOString()
            : String(row.updated_at)
          : null,
        updatedBy: row.updated_by_name || row.updated_by_gpid || null,
      },
      requestId: req.requestId,
    });
  } catch (e) {
    next(e);
  }
});

workOrdersRouter.put('/calendar-filter-config', async (req, res, next) => {
  try {
    const userPermissions = req.user?.permissions ?? [];
    if (!hasAnyPermission(userPermissions, ['admin.users', 'work_order.edit'])) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Permission denied' },
        requestId: req.requestId,
      });
      return;
    }
    const body = calendarFilterConfigBody.parse(req.body ?? {});
    const role = body.role;
    if (role === 'admin' && !hasAnyPermission(userPermissions, ['admin.users'])) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only admin can update admin config' },
        requestId: req.requestId,
      });
      return;
    }
    const configJson = {
      functionalLocations: body.functionalLocations,
      statuses: body.statuses,
      assignedResources: body.assignedResources,
      workOrderTypes: body.workOrderTypes,
      priorities: body.priorities,
    };
    const pool = getPool();
    await ensureCalendarFilterConfigsTable(pool);
    await pool.query(
      `INSERT INTO calendar_filter_configs (role_key, config_json, updated_by_user_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         config_json = VALUES(config_json),
         updated_by_user_id = VALUES(updated_by_user_id),
         updated_at = CURRENT_TIMESTAMP(3)`,
      [role, JSON.stringify(configJson), req.user?.id ?? null]
    );
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.role_key, c.config_json, c.updated_at, u.display_name AS updated_by_name, u.gpid AS updated_by_gpid
       FROM calendar_filter_configs c
       LEFT JOIN users u ON u.id = c.updated_by_user_id
       WHERE c.role_key = ?
       LIMIT 1`,
      [role]
    );
    const row = rows[0] as
      | {
          config_json: unknown;
          updated_at: Date | string | null;
          updated_by_name: string | null;
          updated_by_gpid: string | null;
        }
      | undefined;
    const parsed =
      row && typeof row.config_json === 'string'
        ? (JSON.parse(row.config_json) as Record<string, unknown>)
        : ((row?.config_json as Record<string, unknown>) ?? {});
    res.json({
      item: {
        role,
        functionalLocations: Array.isArray(parsed.functionalLocations) ? parsed.functionalLocations : configJson.functionalLocations,
        statuses: Array.isArray(parsed.statuses) ? parsed.statuses : configJson.statuses,
        assignedResources: Array.isArray(parsed.assignedResources) ? parsed.assignedResources : configJson.assignedResources,
        workOrderTypes: Array.isArray(parsed.workOrderTypes) ? parsed.workOrderTypes : configJson.workOrderTypes,
        priorities: Array.isArray(parsed.priorities) ? parsed.priorities : configJson.priorities,
        updatedAt: row?.updated_at
          ? row.updated_at instanceof Date
            ? row.updated_at.toISOString()
            : String(row.updated_at)
          : null,
        updatedBy: row?.updated_by_name || row?.updated_by_gpid || null,
      },
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

/** ประวัติการย้ายแผนงานจาก audit_log — สำหรับ planner ตรวจย้อนหลัง */
workOrdersRouter.get('/reschedule-history', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const workOrderId = typeof req.query.workOrderId === 'string' ? req.query.workOrderId.trim() : '';
    const fromDate = typeof req.query.from === 'string' ? req.query.from.trim() : '';
    const toDate = typeof req.query.to === 'string' ? req.query.to.trim() : '';
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (fromDate && !dateRe.test(fromDate)) {
      res.status(400).json({
        error: { code: 'INVALID_FROM_DATE', message: 'from must be YYYY-MM-DD' },
        requestId: req.requestId,
      });
      return;
    }
    if (toDate && !dateRe.test(toDate)) {
      res.status(400).json({
        error: { code: 'INVALID_TO_DATE', message: 'to must be YYYY-MM-DD' },
        requestId: req.requestId,
      });
      return;
    }
    const pool = getPool();

    const whereParts = [`a.entity_type = 'work_order'`, `a.action = 'reschedule'`];
    const whereParams: Array<string> = [];
    if (workOrderId) {
      whereParts.push(`a.entity_id = ?`);
      whereParams.push(workOrderId);
    }
    if (fromDate) {
      whereParts.push(`a.created_at >= ?`);
      whereParams.push(`${fromDate} 00:00:00.000`);
    }
    if (toDate) {
      whereParts.push(`a.created_at <= ?`);
      whereParams.push(`${toDate} 23:59:59.999`);
    }
    const whereSql = `WHERE ${whereParts.join(' AND ')}`;

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM audit_log a ${whereSql}`,
      whereParams
    );
    const total = Number((countRows as { cnt: number }[])[0]?.cnt ?? 0);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.id, a.entity_id, a.actor_user_id, u.display_name AS actor_name, a.payload_json, a.created_at
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       ${whereSql}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, pageSize, offset]
    );

    const items = (rows as Array<{
      id: number;
      entity_id: string;
      actor_user_id: number | null;
      actor_name: string | null;
      payload_json: unknown;
      created_at: Date | string;
    }>).map((r) => {
      const payload =
        typeof r.payload_json === 'string'
          ? (JSON.parse(r.payload_json) as Record<string, unknown>)
          : ((r.payload_json as Record<string, unknown>) ?? {});
      return {
        id: String(r.id),
        workOrderId: r.entity_id,
        actorUserId: r.actor_user_id ? String(r.actor_user_id) : null,
        actorName: r.actor_name,
        from: (payload.from as Record<string, unknown>) ?? null,
        to: (payload.to as Record<string, unknown>) ?? null,
        reasonCode: (payload.reasonCode as string | null) ?? null,
        comment: (payload.comment as string | null) ?? null,
        statusTone:
          (payload.calendarTone as string | null) ?? (payload.statusTone as string | null) ?? null,
        createdAt:
          r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ''),
      };
    });

    res.json({ items, total, page, pageSize, requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});

/** รายการ order_confirmations ของใบงาน — F05 (รวมแถวจากนำเข้า SAP และบันทึกในแอป) */
workOrdersRouter.get('/:workOrderId/confirmations', async (req, res, next) => {
  try {
    const woId = Number(req.params.workOrderId);
    if (!Number.isFinite(woId) || woId <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_WORK_ORDER_ID', message: 'workOrderId must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }
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

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT oc.id, oc.work_order_id, oc.confirmed_by_user_id, u.display_name AS confirmed_by_name,
              oc.import_batch_id, oc.sap_confirm_no, oc.sap_counter, oc.sap_line_key,
              oc.actual_start, oc.actual_finish, oc.actual_work_hours,
              oc.reason_code_id, rc.code AS reason_code, rc.label_th AS reason_label_th,
              oc.notes, oc.sync_to_sap_status, oc.created_at
       FROM order_confirmations oc
       LEFT JOIN users u ON u.id = oc.confirmed_by_user_id
       LEFT JOIN reason_codes rc ON rc.id = oc.reason_code_id
       WHERE oc.work_order_id = ?
       ORDER BY oc.created_at DESC`,
      [woId]
    );
    res.json({ items: rows, requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});

/** บันทึกการยืนยันใบงานในแอป (คนละชั้นกับแถวที่ normalize จากไฟล์ Confirm WO) */
workOrdersRouter.post(
  '/:workOrderId/confirmations',
  requirePermission('order_confirmation.create'),
  async (req, res, next) => {
    try {
      const woId = Number(req.params.workOrderId);
      if (!Number.isFinite(woId) || woId <= 0) {
        res.status(400).json({
          error: { code: 'INVALID_WORK_ORDER_ID', message: 'workOrderId must be a positive integer' },
          requestId: req.requestId,
        });
        return;
      }

      const parsed = createConfirmationBody.parse(req.body ?? {});
      const start = tryParseDateTime(parsed.actualStart);
      const finish = tryParseDateTime(parsed.actualFinish);
      if (start.invalid || finish.invalid) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid actualStart or actualFinish datetime' },
          requestId: req.requestId,
        });
        return;
      }

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

      let reasonCodeId: number | null =
        parsed.reasonCodeId === undefined ? null : parsed.reasonCodeId;
      if (reasonCodeId !== null) {
        const [rc] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM reason_codes WHERE id = ? AND is_active = 1 LIMIT 1',
          [reasonCodeId]
        );
        if (!Array.isArray(rc) || rc.length === 0) {
          res.status(400).json({
            error: { code: 'INVALID_REASON_CODE', message: 'reasonCodeId is not a valid active reason' },
            requestId: req.requestId,
          });
          return;
        }
      }

      const syncStatus = parsed.syncToSapStatus ?? 'pending';
      const sapLineKey = `app|${woId}|${randomUUID()}`.slice(0, 192);

      const notes =
        parsed.notes === undefined || parsed.notes === null
          ? null
          : String(parsed.notes).slice(0, 16000);
      const hours =
        parsed.actualWorkHours === undefined || parsed.actualWorkHours === null
          ? null
          : Number(parsed.actualWorkHours);

      const actorId = await resolveActorUserId(pool, req.user && req.user.id > 0 ? req.user.id : 0);

      const [ins] = await pool.query<ResultSetHeader>(
        `INSERT INTO order_confirmations (
           work_order_id, import_batch_id, stg_confirm_row_id, sap_confirm_no, sap_counter, sap_line_key,
           confirmed_by_user_id,
           actual_start, actual_finish, actual_work_hours, reason_code_id, notes, sync_to_sap_status
         ) VALUES (?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          woId,
          sapLineKey,
          actorId,
          start.value ? toMysqlDateTime(start.value) : null,
          finish.value ? toMysqlDateTime(finish.value) : null,
          hours !== null && Number.isFinite(hours) ? hours : null,
          reasonCodeId,
          notes,
          syncStatus,
        ]
      );

      res.status(201).json({
        id: String(ins.insertId),
        workOrderId: String(woId),
        sapLineKey,
        syncToSapStatus: syncStatus,
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
  }
);

workOrdersRouter.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
    const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const calendarMode = dateRe.test(from) && dateRe.test(to);

    if (calendarMode) {
      const fromBound = `${from} 00:00:00.000`;
      const toBound = `${to} 23:59:59.999`;
      const maxRows = 500;
      const [rows] = await pool.query(
        `SELECT w.id, w.order_number, w.order_type, w.system_status, w.user_status,
                w.equipment_id, w.work_center_planned, w.work_center_actual, w.planned_start, w.planned_finish, w.ui_metadata_json,
                oc.actual_start, oc.actual_finish, oc.actual_work_hours, oc.latest_confirmation_confirmed_by_user_id
         FROM work_orders w
         LEFT JOIN (
           SELECT x.work_order_id, x.actual_start, x.actual_finish, x.actual_work_hours,
                  x.confirmed_by_user_id AS latest_confirmation_confirmed_by_user_id
           FROM order_confirmations x
           INNER JOIN (
             SELECT work_order_id, MAX(id) AS max_id
             FROM order_confirmations
             GROUP BY work_order_id
           ) t ON t.max_id = x.id
         ) oc ON oc.work_order_id = w.id
         WHERE (
           (
             w.planned_start IS NOT NULL
             AND w.planned_start <= ?
             AND (w.planned_finish IS NULL OR w.planned_finish >= ?)
           )
           OR (
             w.planned_start IS NULL
             AND w.planned_finish IS NOT NULL
             AND w.planned_finish >= ?
             AND w.planned_finish <= ?
           )
         )
         /* F02: Planning calendar — PM/CM only (ZB01, ZB02, ZB05); spaces normalized e.g. ZB 01 */
         AND UPPER(REPLACE(TRIM(COALESCE(w.order_type, '')), ' ', '')) IN ('ZB01', 'ZB02', 'ZB05')
         ORDER BY w.planned_start IS NULL, w.planned_start ASC, w.id ASC
         LIMIT ?`,
        [toBound, fromBound, fromBound, toBound, maxRows]
      );
      const items = rows as RowDataPacket[];
      const n = items.length;
      res.json({ items, total: n, page: 1, pageSize: n, requestId: req.requestId, truncated: n >= maxRows });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT w.id, w.order_number, w.order_type, w.system_status, w.user_status,
              w.equipment_id, w.work_center_planned, w.work_center_actual, w.planned_start, w.planned_finish, w.ui_metadata_json,
              oc.actual_start, oc.actual_finish, oc.actual_work_hours, oc.latest_confirmation_confirmed_by_user_id
       FROM work_orders w
       LEFT JOIN (
         SELECT x.work_order_id, x.actual_start, x.actual_finish, x.actual_work_hours,
                x.confirmed_by_user_id AS latest_confirmation_confirmed_by_user_id
         FROM order_confirmations x
         INNER JOIN (
           SELECT work_order_id, MAX(id) AS max_id
           FROM order_confirmations
           GROUP BY work_order_id
         ) t ON t.max_id = x.id
       ) oc ON oc.work_order_id = w.id
       ORDER BY w.id DESC
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

/** รายงานใบงานที่เกี่ยวข้องกับวันที่เลือก (เดียวกับช่วงปฏิทิน F02 วันเดียว — ZB01/ZB02/ZB05) เพื่อมอบหมายงาน */
workOrdersRouter.get('/daily-assignment-report', async (req, res, next) => {
  try {
    const raw = typeof req.query.date === 'string' ? req.query.date.trim() : '';
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(raw)) {
      res.status(400).json({
        error: {
          code: 'INVALID_DATE',
          message: 'Query parameter date (YYYY-MM-DD) is required',
        },
        requestId: req.requestId,
      });
      return;
    }

    const pool = getPool();
    const fromBound = `${raw} 00:00:00.000`;
    const toBound = `${raw} 23:59:59.999`;
    const maxRows = 500;
    const [rows] = await pool.query(
      `SELECT w.id, w.order_number, w.order_type, w.system_status, w.user_status,
              w.equipment_id, w.work_center_planned, w.work_center_actual, w.planned_start, w.planned_finish, w.ui_metadata_json,
              oc.actual_start, oc.actual_finish, oc.actual_work_hours, oc.latest_confirmation_confirmed_by_user_id
       FROM work_orders w
       LEFT JOIN (
         SELECT x.work_order_id, x.actual_start, x.actual_finish, x.actual_work_hours,
                x.confirmed_by_user_id AS latest_confirmation_confirmed_by_user_id
         FROM order_confirmations x
         INNER JOIN (
           SELECT work_order_id, MAX(id) AS max_id
           FROM order_confirmations
           GROUP BY work_order_id
         ) t ON t.max_id = x.id
       ) oc ON oc.work_order_id = w.id
       WHERE (
         (
           w.planned_start IS NOT NULL
           AND w.planned_start <= ?
           AND (w.planned_finish IS NULL OR w.planned_finish >= ?)
         )
         OR (
           w.planned_start IS NULL
           AND w.planned_finish IS NOT NULL
           AND w.planned_finish >= ?
           AND w.planned_finish <= ?
         )
       )
       AND UPPER(REPLACE(TRIM(COALESCE(w.order_type, '')), ' ', '')) IN ('ZB01', 'ZB02', 'ZB05')
       ORDER BY w.planned_start IS NULL, w.planned_start ASC, w.id ASC
       LIMIT ?`,
      [toBound, fromBound, fromBound, toBound, maxRows]
    );
    const items = rows as RowDataPacket[];
    const n = items.length;
    res.json({
      date: raw,
      items,
      total: n,
      page: 1,
      pageSize: n,
      truncated: n >= maxRows,
      requestId: req.requestId,
    });
  } catch (e) {
    next(e);
  }
});

/** Tab Task (F02): task_logs ประเภท task_sheet + รายการไฟล์/รูปแนบ */
workOrdersRouter.get('/:workOrderId/task-sheet', async (req, res, next) => {
  try {
    const woId = Number(req.params.workOrderId);
    if (!Number.isFinite(woId) || woId <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_WORK_ORDER_ID', message: 'workOrderId must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }

    const pool = getPool();
    const [woCheck] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM work_orders WHERE id = ? LIMIT 1',
      [woId]
    );
    if (!Array.isArray(woCheck) || woCheck.length === 0) {
      res.status(404).json({
        error: { code: 'WORK_ORDER_NOT_FOUND', message: 'Work order does not exist' },
        requestId: req.requestId,
      });
      return;
    }

    const [tlRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM task_logs
       WHERE work_order_id = ? AND log_type = 'task_sheet'
       ORDER BY id DESC LIMIT 1`,
      [woId]
    );
    const taskLogIdRaw = tlRows[0]?.id;
    const taskLogId =
      taskLogIdRaw !== undefined && taskLogIdRaw !== null ? String(Number(taskLogIdRaw)) : null;

    let attachments: Array<{ id: string; mimeType: string | null; byteSize: number | null; createdAt: string }> = [];
    if (taskLogId) {
      const [aRows] = await pool.query<RowDataPacket[]>(
        `SELECT id, mime_type, byte_size, created_at
         FROM task_log_attachments
         WHERE task_log_id = ?
         ORDER BY id DESC`,
        [taskLogId]
      );
      attachments = (
        aRows as Array<{ id: number; mime_type: string | null; byte_size: number | null; created_at: Date | string }>
      ).map((r) => ({
        id: String(r.id),
        mimeType: r.mime_type,
        byteSize: r.byte_size != null ? Number(r.byte_size) : null,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      }));
    }

    res.json({ taskLogId, attachments, requestId: req.requestId });
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
