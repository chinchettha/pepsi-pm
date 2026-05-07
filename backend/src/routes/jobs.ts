import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { getPool } from '../db/pool.js';
import { enqueueImportJob, getImportJobStatus } from '../jobs/importJobStore.js';

const normalizeBody = z.object({ batchId: z.coerce.number().int().positive() });

const kpiBody = z.object({
  snapshotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  plant: z.string().max(16).optional(),
});

export const jobsRouter = Router();

jobsRouter.use(requireAuth);

/** รายการงานคิว (normalize / KPI snapshot) — สำหรับหน้า FE /jobs */
jobsRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, job_type, status, attempts, max_attempts, last_error,
              created_at, started_at, finished_at
       FROM import_jobs
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [countRows] = await pool.query('SELECT COUNT(*) AS cnt FROM import_jobs');
    const total = Number((countRows as { cnt: number }[])[0]?.cnt ?? 0);
    res.json({ items: rows, total, limit, offset, requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});

jobsRouter.post('/normalize-batch', requirePermission('import.run'), async (req, res, next) => {
  try {
    const { batchId } = normalizeBody.parse(req.body);
    const pool = getPool();
    const jobId = await enqueueImportJob(pool, 'normalize_batch', { batchId });
    res.status(202).json({
      jobId: String(jobId),
      jobType: 'normalize_batch',
      status: 'pending',
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

jobsRouter.post('/kpi-snapshot', requirePermission('report.dashboard'), async (req, res, next) => {
  try {
    const body = kpiBody.parse(req.body);
    const pool = getPool();
    const jobId = await enqueueImportJob(pool, 'kpi_snapshot', {
      snapshotDate: body.snapshotDate,
      plant: body.plant ?? '',
    });
    res.status(202).json({
      jobId: String(jobId),
      jobType: 'kpi_snapshot',
      status: 'pending',
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

jobsRouter.get('/:id', async (req, res, next) => {
  try {
    const jobId = Number(req.params.id);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_JOB_ID', message: 'Job id must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }
    const pool = getPool();
    const row = await getImportJobStatus(pool, jobId);
    if (!row) {
      res.status(404).json({
        error: { code: 'JOB_NOT_FOUND', message: 'Job not found' },
        requestId: req.requestId,
      });
      return;
    }
    res.json({
      id: String(row.id),
      jobType: row.job_type,
      status: row.status,
      payload: row.payload,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      lastError: row.last_error,
      createdAt: row.created_at,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      requestId: req.requestId,
    });
  } catch (e) {
    next(e);
  }
});
