import { Router } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { getPool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const bodySchema = z.object({ gpid: z.string().min(1).max(64) });

export const authRouter = Router();

/**
 * Development-only: mint JWT for an existing user.gpid.
 * Requires header `X-Dev-Auth-Secret` matching `DEV_AUTH_SECRET`, plus `JWT_SECRET`.
 * In production (`NODE_ENV=production`) this route is disabled.
 */
authRouter.post('/dev-token', async (req, res, next) => {
  try {
    if (env.NODE_ENV === 'production') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Not found' },
        requestId: req.requestId,
      });
      return;
    }
    if (!env.DEV_AUTH_SECRET || !env.JWT_SECRET) {
      res.status(503).json({
        error: {
          code: 'TOKEN_DISABLED',
          message: 'Set DEV_AUTH_SECRET and JWT_SECRET in .env for dev-token',
        },
        requestId: req.requestId,
      });
      return;
    }
    const secretHeader = req.headers['x-dev-auth-secret'];
    const provided = Array.isArray(secretHeader) ? secretHeader[0] : secretHeader;
    if (provided !== env.DEV_AUTH_SECRET) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or missing X-Dev-Auth-Secret' },
        requestId: req.requestId,
      });
      return;
    }

    const { gpid } = bodySchema.parse(req.body);
    const pool = getPool();
    const [rows] = await pool.query(`SELECT id FROM users WHERE gpid = ? AND is_active = 1 LIMIT 1`, [
      gpid,
    ]);
    const id = (rows as { id: number }[])[0]?.id;
    if (!id) {
      res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: `No active user with gpid: ${gpid}` },
        requestId: req.requestId,
      });
      return;
    }

    const secret = env.JWT_SECRET as string;
    const accessToken = jwt.sign({ sub: String(id) }, secret, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as SignOptions);

    res.json({
      accessToken,
      tokenType: 'Bearer',
      expiresIn: env.JWT_EXPIRES_IN,
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

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user!.id,
      gpid: req.user!.gpid,
      permissions: req.user!.permissions,
    },
    requestId: req.requestId,
  });
});
