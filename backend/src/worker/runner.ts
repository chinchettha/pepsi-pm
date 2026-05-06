/**
 * DB-backed job worker — run separately from the HTTP server:
 *   npm run worker
 * Polls `import_jobs` (FOR UPDATE SKIP LOCKED) and executes normalize / KPI tasks.
 */
import { env } from '../config/env.js';
import { getPool } from '../db/pool.js';
import { claimNextImportJob, finishImportJob, failImportJob } from '../jobs/importJobStore.js';
import { executeImportJob } from '../jobs/processImportJob.js';

const pollMs = env.WORKER_POLL_MS;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const pool = getPool();
  console.log('[worker] started, poll', pollMs, 'ms');

  for (;;) {
    try {
      const job = await claimNextImportJob(pool);
      if (!job) {
        await sleep(pollMs);
        continue;
      }
      console.log('[worker] job', job.id, job.job_type);
      try {
        await executeImportJob(pool, job);
        await finishImportJob(pool, job.id);
        console.log('[worker] job', job.id, 'done');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[worker] job', job.id, 'error', msg);
        await failImportJob(pool, job.id, msg);
      }
    } catch (e) {
      console.error('[worker] poll error', e);
      await sleep(pollMs);
    }
  }
}

void main().catch((e) => {
  console.error('[worker] fatal', e);
  process.exit(1);
});
