import { apiJson } from '../../api/client';

export type ImportJobStatusDto = {
  id: string;
  jobType: string;
  status: string;
  payload: Record<string, unknown> | null;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  requestId?: string;
};

export function fetchJobStatus(jobId: string): Promise<ImportJobStatusDto> {
  return apiJson<ImportJobStatusDto>(`/api/v1/jobs/${jobId}`, { method: 'GET' });
}

export type ImportJobListRow = {
  id: string | number;
  job_type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

export type ImportJobsListResponse = {
  items: ImportJobListRow[];
  total: number;
  limit: number;
  offset: number;
  requestId?: string;
};

export function fetchImportJobsList(limit = 40, offset = 0): Promise<ImportJobsListResponse> {
  const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiJson<ImportJobsListResponse>(`/api/v1/jobs?${q}`, { method: 'GET' });
}

export type JobEnqueueResponse = {
  jobId: string;
  jobType: string;
  status: string;
  requestId?: string;
};

export function postKpiSnapshot(body: {
  snapshotDate: string;
  plant?: string;
}): Promise<JobEnqueueResponse> {
  return apiJson<JobEnqueueResponse>('/api/v1/jobs/kpi-snapshot', {
    method: 'POST',
    body: JSON.stringify({
      snapshotDate: body.snapshotDate,
      plant: body.plant ?? '',
    }),
  });
}
