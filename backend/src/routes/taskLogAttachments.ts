import { Router } from 'express';
import multer from 'multer';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { getPool } from '../db/pool.js';
import { env } from '../config/env.js';
import {
  isRasterImageMime,
  rasterBufferToWebp,
} from '../services/attachmentWebp.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.ATTACHMENTS_MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok = isRasterImageMime(file.mimetype);
    cb(null, ok);
  },
});

export const taskLogAttachmentsRouter = Router();

taskLogAttachmentsRouter.use(requireAuth, requirePermission('work_order.edit'));

/** Relative path บันทึกใน DB (ไม่มี leading slash) */
function relativeStoragePath(taskLogId: string, fileName: string): string {
  return path.posix.join('task_logs', taskLogId, fileName);
}

taskLogAttachmentsRouter.post('/:taskLogId/attachments', upload.single('file'), async (req, res, next) => {
  try {
    const taskLogId = req.params.taskLogId;
    if (!/^\d+$/.test(taskLogId)) {
      res.status(400).json({
        error: { code: 'INVALID_TASK_LOG_ID', message: 'taskLogId must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        error: {
          code: 'MISSING_FILE',
          message: 'Expected multipart field "file" (JPEG, PNG, WebP, GIF, …)',
        },
        requestId: req.requestId,
      });
      return;
    }

    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM task_logs WHERE id = ? LIMIT 1',
      [taskLogId]
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).json({
        error: { code: 'TASK_LOG_NOT_FOUND', message: 'Task log does not exist' },
        requestId: req.requestId,
      });
      return;
    }

    let webpBuffer: Buffer;
    if (env.ATTACHMENTS_USE_SHARP) {
      try {
        webpBuffer = await rasterBufferToWebp(req.file.buffer);
      } catch {
        res.status(400).json({
          error: {
            code: 'IMAGE_PROCESS_FAILED',
            message: 'Could not decode or convert image to WebP',
          },
          requestId: req.requestId,
        });
        return;
      }
    } else {
      if (req.file.mimetype !== 'image/webp') {
        res.status(400).json({
          error: {
            code: 'WEBP_REQUIRED',
            message:
              'Server-side conversion is disabled (ATTACHMENTS_USE_SHARP=false); upload image/webp only',
          },
          requestId: req.requestId,
        });
        return;
      }
      webpBuffer = req.file.buffer;
    }

    const fileName = `${randomUUID()}.webp`;
    const rel = relativeStoragePath(taskLogId, fileName);
    const absFile = path.join(env.ATTACHMENTS_ROOT_ABS, 'task_logs', taskLogId, fileName);

    await fs.mkdir(path.dirname(absFile), { recursive: true });
    await fs.writeFile(absFile, webpBuffer);

    const byteSize = webpBuffer.length;
    const [ins] = await pool.query<ResultSetHeader>(
      `INSERT INTO task_log_attachments (task_log_id, storage_path, mime_type, byte_size)
       VALUES (?, ?, 'image/webp', ?)`,
      [taskLogId, rel, byteSize]
    );
    const insertId = ins.insertId;

    res.status(201).json({
      id: String(insertId),
      taskLogId,
      storagePath: rel,
      mimeType: 'image/webp',
      byteSize,
      requestId: req.requestId,
    });
  } catch (e) {
    next(e);
  }
});
