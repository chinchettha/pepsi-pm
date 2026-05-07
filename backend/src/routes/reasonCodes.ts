import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { requireAuth } from '../middleware/auth.js';
import { getPool } from '../db/pool.js';

export const reasonCodesRouter = Router();

reasonCodesRouter.use(requireAuth);

/** รายการเหตุผล (Confirm WO / F05) — ใช้ใน dropdown ฝั่ง FE */
reasonCodesRouter.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, code, label_th, label_en, sort_order
       FROM reason_codes
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    );
    res.json({ items: rows, requestId: req.requestId });
  } catch (e) {
    next(e);
  }
});
