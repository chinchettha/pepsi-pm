import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { requireAuth } from '../middleware/auth.js';
import { getPool } from '../db/pool.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

/**
 * สรุปสำหรับแดชบอร์ด (กราฟ) — อ่านอย่างเดียว
 */
dashboardRouter.get('/stats', async (req, res, next) => {
  try {
    const pool = getPool();

    const [totalRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS c FROM work_orders');
    const workOrdersTotal = Number(totalRows[0]?.c ?? 0);

    const [byStatus] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(NULLIF(TRIM(system_status), ''), '(ไม่ระบุ)') AS status_label, COUNT(*) AS cnt
       FROM work_orders
       GROUP BY COALESCE(NULLIF(TRIM(system_status), ''), '(ไม่ระบุ)')
       ORDER BY cnt DESC`
    );

    const [byDay] = await pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(DATE(started_at), '%Y-%m-%d') AS d, COUNT(*) AS cnt
       FROM import_batches
       WHERE started_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY DATE(started_at)
       ORDER BY d ASC`
    );

    const [byKind] = await pool.query<RowDataPacket[]>(
      `SELECT source_kind AS k, COUNT(*) AS cnt
       FROM import_batches
       WHERE started_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY source_kind
       ORDER BY cnt DESC`
    );

    res.json({
      workOrders: {
        total: workOrdersTotal,
        bySystemStatus: byStatus.map((r) => ({
          status: String(r.status_label),
          count: Number(r.cnt),
        })),
      },
      importsByDay: byDay.map((r) => ({
        date: String(r.d),
        count: Number(r.cnt),
      })),
      importsByKind: byKind.map((r) => ({
        sourceKind: String(r.k),
        count: Number(r.cnt),
      })),
      requestId: req.requestId,
    });
  } catch (e) {
    next(e);
  }
});

function parseMetricsJson(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
}

/**
 * รายการ snapshot จาก `kpi_daily_snapshots` (หลังรัน job KPI / worker) — เรียงวันที่ใหม่สุดก่อน
 */
dashboardRouter.get('/kpi-snapshots', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 60), 200);
    const plantRaw = req.query.plant;
    const plant =
      typeof plantRaw === 'string'
        ? plantRaw
        : Array.isArray(plantRaw) && typeof plantRaw[0] === 'string'
          ? plantRaw[0]
          : undefined;

    const pool = getPool();
    let sql = `SELECT id, snapshot_date, plant, metrics_json, created_at
               FROM kpi_daily_snapshots`;
    const params: unknown[] = [];
    if (plant !== undefined) {
      sql += ' WHERE plant = ?';
      params.push(plant);
    }
    sql += ' ORDER BY snapshot_date DESC, id DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

    res.json({
      items: rows.map((r) => {
        const d = r.snapshot_date as Date | string;
        const snapshotDate =
          d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
        return {
          id: String(r.id),
          snapshotDate,
          plant: String(r.plant ?? ''),
          metrics: parseMetricsJson(r.metrics_json),
          createdAt: r.created_at,
        };
      }),
      requestId: req.requestId,
    });
  } catch (e) {
    next(e);
  }
});
