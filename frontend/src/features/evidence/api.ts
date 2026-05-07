import { apiFetch, apiErrorFromResponse, readJsonBody } from '../../api/client';

export type TaskLogAttachmentCreated = {
  id: string;
  taskLogId: string;
  storagePath: string;
  mimeType: string;
  byteSize: number;
  requestId?: string;
};

export async function postTaskLogAttachment(taskLogId: number, file: File): Promise<TaskLogAttachmentCreated> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiFetch(`/api/v1/task-logs/${taskLogId}/attachments`, {
    method: 'POST',
    body: fd,
  });
  const body = await readJsonBody(res);
  if (!res.ok) {
    throw apiErrorFromResponse(res, body);
  }
  return body as TaskLogAttachmentCreated;
}

/** PDF / Word / Excel — Tab Task (F02) */
export async function postTaskLogDocument(taskLogId: number, file: File): Promise<TaskLogAttachmentCreated> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiFetch(`/api/v1/task-logs/${taskLogId}/attachments/document`, {
    method: 'POST',
    body: fd,
  });
  const body = await readJsonBody(res);
  if (!res.ok) {
    throw apiErrorFromResponse(res, body);
  }
  return body as TaskLogAttachmentCreated;
}
