import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

/** F10 RBAC — expand to query `user_roles` / `permissions` when auth is real. */
export function requirePermission(_permission: string): RequestHandler {
  return (req, res, next) => {
    if (env.SKIP_AUTH) {
      return next();
    }
    const perms = req.user?.permissions ?? [];
    if (perms.includes('*') || perms.includes(_permission)) {
      return next();
    }
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: `Missing permission: ${_permission}` },
      requestId: req.requestId,
    });
  };
}
