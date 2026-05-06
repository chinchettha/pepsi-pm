import type { Pool } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

/**
 * Materialize one row in `kpi_daily_snapshots` (F09) — aggregate from current `work_orders`.
 */
export async function runKpiSnapshot(pool: Pool, snapshotDate: string, plant: string): Promise<void> {
  const [statusRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(system_status, '') AS st, COUNT(*) AS cnt
     FROM work_orders
     GROUP BY COALESCE(system_status, '')`
  );

  const bySystemStatus: Record<string, number> = {};
  for (const r of statusRows) {
    const row = r as { st: string; cnt: number };
    bySystemStatus[row.st || '(none)'] = Number(row.cnt);
  }

  const [totalRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS c FROM work_orders`);
  const workOrderTotal = Number((totalRows[0] as { c: number }).c ?? 0);

  const [gmRows] = await pool.query<RowDataPacket[]>(
    `SELECT movement_kind, COUNT(*) AS c FROM goods_movements GROUP BY movement_kind`
  );
  const goodsMovementsByKind: Record<string, number> = {};
  for (const r of gmRows) {
    const row = r as { movement_kind: string; c: number };
    goodsMovementsByKind[row.movement_kind] = Number(row.c);
  }

  const metrics = {
    generatedAt: new Date().toISOString(),
    workOrderTotal,
    workOrdersBySystemStatus: bySystemStatus,
    goodsMovementsByKind,
  };

  await pool.execute(
    `INSERT INTO kpi_daily_snapshots (snapshot_date, plant, metrics_json)
     VALUES (?, ?, CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE
       metrics_json = VALUES(metrics_json),
       created_at = CURRENT_TIMESTAMP(3)`,
    [snapshotDate, plant, JSON.stringify(metrics)]
  );
}
