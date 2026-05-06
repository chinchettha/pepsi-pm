import { apiJson } from '../../api/client';

export type WorkOrderRow = {
  id: string | number;
  order_number: string;
  order_type: string | null;
  system_status: string | null;
  planned_start: string | null;
  planned_finish: string | null;
};

export type WorkOrdersListResponse = {
  items: WorkOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  requestId?: string;
};

export function fetchWorkOrders(page = 1, pageSize = 20): Promise<WorkOrdersListResponse> {
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return apiJson<WorkOrdersListResponse>(`/api/v1/work-orders?${q.toString()}`, {
    method: 'GET',
  });
}

export type WorkOrderDetail = {
  id: string | number;
  order_number: string;
  order_type: string | null;
  system_status: string | null;
  user_status: string | null;
  equipment_id: string | null;
  work_center_planned: string | null;
  work_center_actual: string | null;
  planned_start: string | null;
  planned_finish: string | null;
  basic_start: string | null;
  basic_finish: string | null;
  last_import_batch_id: string | number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WorkOrderDetailResponse = {
  item: WorkOrderDetail;
  requestId?: string;
};

export function fetchWorkOrder(workOrderId: number): Promise<WorkOrderDetailResponse> {
  return apiJson<WorkOrderDetailResponse>(`/api/v1/work-orders/${workOrderId}`, { method: 'GET' });
}

export type TaskLogCreatedResponse = {
  id: string;
  workOrderId: string;
  logType: string;
  requestId?: string;
};

export function createTaskLog(workOrderId: number, logType = 'photo'): Promise<TaskLogCreatedResponse> {
  return apiJson<TaskLogCreatedResponse>(`/api/v1/work-orders/${workOrderId}/task-logs`, {
    method: 'POST',
    body: JSON.stringify({ logType }),
  });
}
