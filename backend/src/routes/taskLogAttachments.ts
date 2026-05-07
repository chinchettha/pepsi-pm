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

const DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function extensionForDocumentMime(mime: string): string {
  const m: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  };
  return m[mime] ?? '.bin';
}

const uploadDoc = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.ATTACHMENTS_MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    cb(null, DOCUMENT_MIMES.has(file.mimetype));
  },
});

export const taskLogAttachmentsRouter = Router();

taskLogAttachmentsRouter.use(requireAuth);

/** Relative path บันทึกใน DB (ไม่มี leading slash) */
function relativeStoragePath(taskLogId: string, fileName: string): string {
  return path.posix.join('task_logs', taskLogId, fileName);
}

function absoluteAttachmentPath(storagePath: string): string {
  const parts = storagePath.replace(/^[/\\]+/, '').split(/[/\\]+/).filter(Boolean);
  return path.join(env.ATTACHMENTS_ROOT_ABS, ...parts);
}

taskLogAttachmentsRouter.get('/:taskLogId/attachments/:attachmentId/file', async (req, res, next) => {
  try {
    const taskLogId = req.params.taskLogId;
    const attachmentId = req.params.attachmentId;
    if (!/^\d+$/.test(taskLogId) || !/^\d+$/.test(attachmentId)) {
      res.status(400).json({
        error: { code: 'INVALID_ID', message: 'taskLogId and attachmentId must be positive integers' },
        requestId: req.requestId,
      });
      return;
    }

    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT a.storage_path, a.mime_type
       FROM task_log_attachments a
       INNER JOIN task_logs tl ON tl.id = a.task_log_id
       WHERE a.id = ? AND a.task_log_id = ?
       LIMIT 1`,
      [attachmentId, taskLogId]
    );
    const row = rows[0] as { storage_path: string; mime_type: string | null } | undefined;
    if (!row) {
      res.status(404).json({
        error: { code: 'ATTACHMENT_NOT_FOUND', message: 'Attachment does not exist' },
        requestId: req.requestId,
      });
      return;
    }

    const abs = absoluteAttachmentPath(row.storage_path);
    try {
      await fs.access(abs);
    } catch {
      res.status(404).json({
        error: { code: 'FILE_MISSING', message: 'Attachment file missing on disk' },
        requestId: req.requestId,
      });
      return;
    }

    const mime = row.mime_type || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.sendFile(path.resolve(abs));
  } catch (e) {
    next(e);
  }
});

taskLogAttachmentsRouter.get('/:taskLogId/attachments', async (req, res, next) => {
  try {
    const taskLogId = req.params.taskLogId;
    if (!/^\d+$/.test(taskLogId)) {
      res.status(400).json({
        error: { code: 'INVALID_TASK_LOG_ID', message: 'taskLogId must be a positive integer' },
        requestId: req.requestId,
      });
      return;
    }

    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, mime_type, byte_size, created_at
       FROM task_log_attachments
       WHERE task_log_id = ?
       ORDER BY id DESC`,
      [taskLogId]
    );

    const items = (rows as Array<{ id: number; mime_type: string | null; byte_size: number | null; created_at: Date }>).map(
      (r) => ({
        id: String(r.id),
        mimeType: r.mime_type,
        byteSize: r.byte_size != null ? Number(r.byte_size) : null,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      })
    );

    res.json({ items, requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});

taskLogAttachmentsRouter.post(
  '/:taskLogId/attachments/document',
  requirePermission('work_order.edit'),
  uploadDoc.single('file'),
  async (req, res, next) => {
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
            message: `Expected multipart field "file" (PDF, Word, Excel — ${[...DOCUMENT_MIMES].join(', ')})`,
          },
          requestId: req.requestId,
        });
        return;
      }

      const pool = getPool();
      const [exists] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM task_logs WHERE id = ? LIMIT 1',
        [taskLogId]
      );
      if (!Array.isArray(exists) || exists.length === 0) {
        res.status(404).json({
          error: { code: 'TASK_LOG_NOT_FOUND', message: 'Task log does not exist' },
          requestId: req.requestId,
        });
        return;
      }

      const ext = extensionForDocumentMime(req.file.mimetype);
      const fileName = `${randomUUID()}${ext}`;
      const rel = relativeStoragePath(taskLogId, fileName);
      const absFile = path.join(env.ATTACHMENTS_ROOT_ABS, 'task_logs', taskLogId, fileName);

      await fs.mkdir(path.dirname(absFile), { recursive: true });
      await fs.writeFile(absFile, req.file.buffer);

      const byteSize = req.file.buffer.length;
      const mimeType = req.file.mimetype;

      const [ins] = await pool.query<ResultSetHeader>(
        `INSERT INTO task_log_attachments (task_log_id, storage_path, mime_type, byte_size)
         VALUES (?, ?, ?, ?)`,
        [taskLogId, rel, mimeType, byteSize]
      );

      res.status(201).json({
        id: String(ins.insertId),
        taskLogId,
        storagePath: rel,
        mimeType,
        byteSize,
        requestId: req.requestId,
      });
    } catch (e) {
      next(e);
    }
  }
);

taskLogAttachmentsRouter.post(
  '/:taskLogId/attachments',
  requirePermission('work_order.edit'),
  upload.single('file'),
  async (req, res, next) => {
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
  }
);
