import { Router } from 'express';

export const healthRouter = Router();

/** Liveness — ไม่มี prefix (ใช้กับ load balancer / Docker healthcheck) */
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
