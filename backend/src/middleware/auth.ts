import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getPool } from '../db/pool.js';
import { loadAuthUser } from '../services/userPermissions.js';

/**
 * SKIP_AUTH=true → stub user (all permissions; `imported_by_user_id` stays null when id is 0).
 * Otherwise: optional `Authorization: Bearer <JWT>` — verified with `JWT_SECRET`, user loaded from DB.
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  if (env.SKIP_AUTH) {
    req.user = {
      id: 0,
      gpid: '__dev__',
      permissions: ['*'],
    };
    return next();
  }

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return next();
  }

  const token = auth.slice('Bearer '.length).trim();
  if (!token || !env.JWT_SECRET) {
    return next();
  }

  Promise.resolve()
    .then(async () => {
      try {
        const payload = jwt.verify(token, env.JWT_SECRET!) as { sub?: string };
        const id = Number(payload.sub);
        if (!Number.isFinite(id) || id <= 0) {
          return;
        }
        const user = await loadAuthUser(getPool(), id);
        if (user) {
          req.user = user;
        }
      } catch {
        /* invalid or expired token — stay anonymous */
      }
    })
    .then(() => next())
    .catch(next);
};

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.user) {
    return next();
  }
  res.status(401).json({
    error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    requestId: req.requestId,
  });
};
