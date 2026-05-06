import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { getPool } from '../db/pool.js';
import { runSapFileImport } from '../services/importRun.js';

const kindSchema = z.enum(['iw37n', 'confirm_wo', 'gi', 'gr']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/octet-stream' ||
      file.originalname.toLowerCase().endsWith('.xls') ||
      file.originalname.toLowerCase().endsWith('.xlsx');
    cb(null, ok);
  },
});

export const importsRouter = Router();

importsRouter.use(requireAuth, requirePermission('import.run'));

importsRouter.post('/:kind', upload.single('file'), async (req, res, next) => {
  try {
    const kind = kindSchema.parse(req.params.kind);
    if (!req.file) {
      res.status(400).json({
        error: { code: 'MISSING_FILE', message: 'Expected multipart field "file"' },
        requestId: req.requestId,
      });
      return;
    }

    const pool = getPool();
    const userId = req.user && req.user.id > 0 ? req.user.id : null;
    const result = await runSapFileImport(pool, {
      kind,
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      userId,
    });

    res.status(202).json({
      batchId: String(result.batchId),
      sourceKind: kind,
      status: result.status,
      rowCountAccepted: result.rowCountAccepted,
      rowCountRejected: result.rowCountRejected,
      message:
        result.status === 'failed'
          ? 'No data rows could be imported (file empty or unreadable)'
          : 'Rows written to staging tables',
      requestId: req.requestId,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      res.status(400).json({
        error: { code: 'INVALID_KIND', message: e.message },
        requestId: req.requestId,
      });
      return;
    }
    if (e instanceof Error) {
      if (e.message === 'UNREADABLE_FILE' || e.message === 'EMPTY_FILE') {
        res.status(400).json({
          error: { code: e.message, message: 'Could not parse spreadsheet or file was empty' },
          requestId: req.requestId,
        });
        return;
      }
      if (e.message.startsWith('TOO_MANY_ROWS')) {
        res.status(413).json({
          error: { code: 'TOO_MANY_ROWS', message: e.message },
          requestId: req.requestId,
        });
        return;
      }
      if (e.message === 'DUPLICATE_FILE_SHA') {
        const existingBatchId = (e as Error & { existingBatchId?: number }).existingBatchId;
        res.status(409).json({
          error: {
            code: 'DUPLICATE_FILE_SHA',
            message: 'Same file content was already imported for this kind (DEDUPE_REJECT_DUPLICATE_FILE_SHA=true)',
            existingBatchId: existingBatchId !== undefined ? String(existingBatchId) : undefined,
          },
          requestId: req.requestId,
        });
        return;
      }
    }
    next(e);
  }
});
