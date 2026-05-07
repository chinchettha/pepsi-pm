import { Router } from 'express';
import { authRouter } from './auth.js';
import { importsRouter } from './imports.js';
import { importBatchesRouter } from './importBatches.js';
import { jobsRouter } from './jobs.js';
import { workOrdersRouter } from './workOrders.js';
import { taskLogAttachmentsRouter } from './taskLogAttachments.js';
import { dashboardRouter } from './dashboard.js';
import { adminRouter } from './admin.js';
import { reasonCodesRouter } from './reasonCodes.js';

const apiVersion = '0.1.0';

export function createApiV1Router(): Router {
  const v1 = Router();

  v1.get('/health', (_req, res) => {
    res.json({ status: 'ok', apiVersion });
  });

  v1.use('/auth', authRouter);
  v1.use('/imports', importsRouter);
  v1.use('/import-batches', importBatchesRouter);
  v1.use('/jobs', jobsRouter);
  v1.use('/reason-codes', reasonCodesRouter);
  v1.use('/work-orders', workOrdersRouter);
  v1.use('/task-logs', taskLogAttachmentsRouter);
  v1.use('/dashboard', dashboardRouter);
  v1.use('/admin', adminRouter);

  const root = Router();
  root.use('/api/v1', v1);
  return root;
}
