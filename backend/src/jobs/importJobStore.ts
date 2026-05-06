import type { Pool } from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export type ImportJobType = 'normalize_batch' | 'kpi_snapshot';

export type ImportJobRow = {
  id: number;
  job_type: ImportJobType;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

export type ImportJobStatusRow = {
  id: number;
  job_type: string;
  status: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
};

export async function enqueueImportJob(
  pool: Pool,
  jobType: ImportJobType,
  payload: Record<string, unknown>
): Promise<number> {
  const [r] = await pool.execute<ResultSetHeader>(
    `INSERT INTO import_jobs (job_type, payload_json, status) VALUES (?, CAST(? AS JSON), 'pending')`,
    [jobType, JSON.stringify(payload)]
  );
  return Number(r.insertId);
}

export async function getImportJob(pool: Pool, jobId: number): Promise<ImportJobRow | null> {
  const row = await getImportJobStatus(pool, jobId);
  if (!row) return null;
  return {
    id: row.id,
    job_type: row.job_type as ImportJobType,
    payload: row.payload,
    attempts: row.attempts,
    max_attempts: row.max_attempts,
  };
}

export async function getImportJobStatus(pool: Pool, jobId: number): Promise<ImportJobStatusRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, job_type, status, payload_json, attempts, max_attempts, last_error,
            created_at, started_at, finished_at
     FROM import_jobs WHERE id = ? LIMIT 1`,
    [jobId]
  );
  const row = rows[0] as
    | {
        id: number;
        job_type: string;
        status: string;
        payload_json: unknown;
        attempts: number;
        max_attempts: number;
        last_error: string | null;
        created_at: Date;
        started_at: Date | null;
        finished_at: Date | null;
      }
    | undefined;
  if (!row) return null;
  const payload =
    typeof row.payload_json === 'string'
      ? (JSON.parse(row.payload_json) as Record<string, unknown>)
      : (row.payload_json as Record<string, unknown>);
  return {
    id: row.id,
    job_type: row.job_type,
    status: row.status,
    payload,
    attempts: row.attempts,
    max_attempts: row.max_attempts,
    last_error: row.last_error,
    created_at: row.created_at,
    started_at: row.started_at,
    finished_at: row.finished_at,
  };
}

/** Claim one pending job (SKIP LOCKED). Returns null if queue empty. */
export async function claimNextImportJob(pool: Pool): Promise<ImportJobRow | null> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT id, job_type, payload_json, attempts, max_attempts
       FROM import_jobs
       WHERE status = 'pending' AND available_at <= CURRENT_TIMESTAMP(3)
       ORDER BY id ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    );
    const row = rows[0] as
      | { id: number; job_type: string; payload_json: unknown; attempts: number; max_attempts: number }
      | undefined;
    if (!row) {
      await conn.commit();
      return null;
    }

    await conn.execute(
      `UPDATE import_jobs
       SET status = 'running', started_at = CURRENT_TIMESTAMP(3), attempts = attempts + 1
       WHERE id = ?`,
      [row.id]
    );
    await conn.commit();

    const payload =
      typeof row.payload_json === 'string'
        ? (JSON.parse(row.payload_json) as Record<string, unknown>)
        : (row.payload_json as Record<string, unknown>);

    return {
      id: row.id,
      job_type: row.job_type as ImportJobType,
      payload,
      attempts: row.attempts + 1,
      max_attempts: row.max_attempts,
    };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function finishImportJob(pool: Pool, jobId: number): Promise<void> {
  await pool.execute(
    `UPDATE import_jobs SET status = 'done', finished_at = CURRENT_TIMESTAMP(3), last_error = NULL WHERE id = ?`,
    [jobId]
  );
}

export async function failImportJob(pool: Pool, jobId: number, message: string): Promise<void> {
  const err = message.slice(0, 2048);
  await pool.execute(
    `UPDATE import_jobs SET status = 'failed', finished_at = CURRENT_TIMESTAMP(3), last_error = ? WHERE id = ?`,
    [err, jobId]
  );
}
