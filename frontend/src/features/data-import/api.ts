import {
  apiFetch,
  apiJson,
  apiErrorFromResponse,
  readJsonBody,
} from '../../api/client';
import type { ImportBatchRow, ImportErrorRow, ImportKind } from './types';

export type ImportUploadResult = {
  batchId: string;
  sourceKind: string;
  status: string;
  rowCountAccepted: number;
  rowCountRejected: number;
  message?: string;
  requestId?: string;
};

export async function postSapImport(kind: ImportKind, file: File): Promise<ImportUploadResult> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiFetch(`/api/v1/imports/${kind}`, { method: 'POST', body: fd });
  const body = await readJsonBody(res);
  if (!res.ok) {
    throw apiErrorFromResponse(res, body);
  }
  return body as ImportUploadResult;
}

export type ImportBatchesListResponse = {
  items: ImportBatchRow[];
  requestId?: string;
};

export function fetchImportBatches(limit = 50): Promise<ImportBatchesListResponse> {
  const q = new URLSearchParams({ limit: String(limit), offset: '0' });
  return apiJson<ImportBatchesListResponse>(`/api/v1/import-batches?${q}`, { method: 'GET' });
}

export type ImportErrorsResponse = {
  items: ImportErrorRow[];
  requestId?: string;
};

export function fetchImportBatchErrors(batchId: number): Promise<ImportErrorsResponse> {
  return apiJson<ImportErrorsResponse>(`/api/v1/import-batches/${batchId}/errors`, {
    method: 'GET',
  });
}

export type NormalizeBatchResult = {
  batchId: string;
  sourceKind: string;
  workOrdersUpserted: number;
  goodsMovementsInserted: number;
  orderConfirmationsInserted: number;
  rowsSkipped: number;
  orderConfirmationRowsSkipped: number;
  requestId?: string;
};

export function postNormalizeBatch(batchId: number): Promise<NormalizeBatchResult> {
  return apiJson<NormalizeBatchResult>(`/api/v1/import-batches/${batchId}/normalize`, {
    method: 'POST',
  });
}

export type EnqueueNormalizeResponse = {
  jobId: string;
  batchId: string;
  message: string;
  requestId?: string;
};

export function postNormalizeBatchAsync(batchId: number): Promise<EnqueueNormalizeResponse> {
  return apiJson<EnqueueNormalizeResponse>(
    `/api/v1/import-batches/${batchId}/normalize/async`,
    { method: 'POST' }
  );
}
