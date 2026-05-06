import type { Pool } from 'mysql2/promise';
import { normalizeImportBatch } from '../services/normalizeBatch.js';
import { runKpiSnapshot } from './kpiSnapshot.js';
import type { ImportJobRow } from './importJobStore.js';

export async function executeImportJob(pool: Pool, job: ImportJobRow): Promise<void> {
  if (job.job_type === 'normalize_batch') {
    const batchId = Number(job.payload.batchId);
    if (!Number.isFinite(batchId) || batchId <= 0) {
      throw new Error('INVALID_PAYLOAD_BATCH_ID');
    }
    await normalizeImportBatch(pool, batchId);
    return;
  }

  if (job.job_type === 'kpi_snapshot') {
    const snapshotDate = String(job.payload.snapshotDate ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)) {
      throw new Error('INVALID_PAYLOAD_SNAPSHOT_DATE');
    }
    const plant = typeof job.payload.plant === 'string' ? job.payload.plant.slice(0, 16) : '';
    await runKpiSnapshot(pool, snapshotDate, plant);
    return;
  }

  throw new Error(`UNKNOWN_JOB_TYPE:${job.job_type}`);
}
