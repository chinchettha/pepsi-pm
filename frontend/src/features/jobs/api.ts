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
