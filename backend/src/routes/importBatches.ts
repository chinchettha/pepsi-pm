import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { getPool } from '../db/pool.js';
import { normalizeImportBatch } from '../services/normalizeBatch.js';
import { enqueueImportJob } from '../jobs/importJobStore.js';

export const importBatchesRouter = Router();

importBatchesRouter.use(requireAuth);

/** Queue normalize in worker (`npm run worker`) — returns 202 + jobId */
importBatchesRouter.post('/:id/normalize/async', requirePermission('import.run'), async (req, res, next) => {
  try {
    const batchId = Number(req.params.id);
    if (!Number.isFinite(batchId) || batchId <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_BATCH_ID', message: 'Batch id must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }
    const pool = getPool();
    const jobId = await enqueueImportJob(pool, 'normalize_batch', { batchId });
    res.status(202).json({
      jobId: String(jobId),
      batchId: String(batchId),
      message: 'Job enqueued; poll GET /api/v1/jobs/:jobId',
      requestId: req.requestId,
    });
  } catch (e) {
    next(e);
  }
});

importBatchesRouter.post('/:id/normalize', requirePermission('import.run'), async (req, res, next) => {
  try {
    const batchId = Number(req.params.id);
    if (!Number.isFinite(batchId) || batchId <= 0) {
      res.status(400).json({
        error: { code: 'INVALID_BATCH_ID', message: 'Batch id must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }
    const pool = getPool();
    const result = await normalizeImportBatch(pool, batchId);
    res.status(200).json({
      ...result,
      batchId: String(result.batchId),
      requestId: req.requestId,
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'BATCH_NOT_FOUND') {
        res.status(404).json({
          error: { code: e.message, message: 'Import batch not found' },
          requestId: req.requestId,
        });
        return;
      }
      if (e.message === 'BATCH_EMPTY') {
        res.status(400).json({
          error: { code: e.message, message: 'Batch has no accepted staging rows' },
          requestId: req.requestId,
        });
        return;
      }
      if (e.message === 'BATCH_KIND_UNSUPPORTED') {
        res.status(400).json({
          error: { code: e.message, message: 'Only iw37n, confirm_wo, gi, gr batches can be normalized' },
          requestId: req.requestId,
        });
        return;
      }
    }
    next(e);
  }
});

importBatchesRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const kind = typeof req.query.source_kind === 'string' ? req.query.source_kind : undefined;
    const pool = getPool();
    const sql = kind
      ? `SELECT id, source_kind, source_file_name, status, started_at, finished_at,
                row_count_accepted, row_count_rejected
         FROM import_batches WHERE source_kind = ?
         ORDER BY id DESC LIMIT ? OFFSET ?`
      : `SELECT id, source_kind, source_file_name, status, started_at, finished_at,
                row_count_accepted, row_count_rejected
         FROM import_batches
         ORDER BY id DESC LIMIT ? OFFSET ?`;
    const params = kind ? [kind, limit, offset] : [limit, offset];
    const [rows] = await pool.query(sql, params);
    res.json({ items: rows, requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});

importBatchesRouter.get('/:id/errors', async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, import_batch_id, source_row_number, error_code, error_message
       FROM import_errors
       WHERE import_batch_id = ?
       ORDER BY id`,
      [req.params.id]
    );
    res.json({ items: rows, requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});
