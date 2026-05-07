import { apiJson } from '../../api/client';

export type WorkOrderRow = {
  id: string | number;
  order_number: string;
  order_type: string | null;
  system_status: string | null;
  user_status?: string | null;
  equipment_id?: string | null;
  work_center_planned?: string | null;
  work_center_actual?: string | null;
  planned_start: string | null;
  planned_finish: string | null;
  ui_metadata_json?: unknown;
  actual_start?: string | null;
  actual_finish?: string | null;
  actual_work_hours?: string | number | null;
  /** ผู้ใช้ที่บันทึก confirmation ล่าสุดในระบบ (Close WO); null = ยังไม่มีการยืนยันในแอป */
  latest_confirmation_confirmed_by_user_id?: string | number | null;
};

export type WorkOrdersListResponse = {
  items: WorkOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  requestId?: string;
  /** มีเมื่อเรียกด้วย from/to (โหมดปฏิทิน) และโหลดครบขีดจำกัดแถว */
  truncated?: boolean;
};

export function fetchWorkOrders(page = 1, pageSize = 20): Promise<WorkOrdersListResponse> {
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return apiJson<WorkOrdersListResponse>(`/api/v1/work-orders?${q.toString()}`, {
    method: 'GET',
  });
}

/** ใบงานที่ช่วงวันที่ทับซ้อนกับ [from, to] (ปิดท้ายรวม) — ปฏิทิน F02 กรองเฉพาะ PM/CM ZB01/ZB02/ZB05 ที่ backend */
export function fetchWorkOrdersForCalendarRange(
  from: string,
  to: string
): Promise<WorkOrdersListResponse> {
  const q = new URLSearchParams({ from, to });
  return apiJson<WorkOrdersListResponse>(`/api/v1/work-orders?${q.toString()}`, {
    method: 'GET',
  });
}

/** ใบงาน PM/CM (ZB01–ZB05) ที่ทับซ้อนกับวันที่เลือก — สำหรับหน้ารายงานมอบหมายรายวัน */
export type DailyAssignmentReportResponse = WorkOrdersListResponse & {
  date: string;
};

export function fetchDailyAssignmentReport(date: string): Promise<DailyAssignmentReportResponse> {
  const q = new URLSearchParams({ date });
  return apiJson<DailyAssignmentReportResponse>(
    `/api/v1/work-orders/daily-assignment-report?${q.toString()}`,
    { method: 'GET' }
  );
}

export type StatusColorTone = 'green' | 'blue' | 'red' | 'default';
export type StatusColorMapping = {
  code: string;
  tone: StatusColorTone;
  label: string | null;
  priority: number;
  isActive: boolean;
};
export type StatusColorMappingsResponse = {
  items: StatusColorMapping[];
  requestId?: string;
};

export function fetchStatusColorMappings(): Promise<StatusColorMappingsResponse> {
  return apiJson<StatusColorMappingsResponse>('/api/v1/work-orders/status-color-mappings', {
    method: 'GET',
  });
}

export type CalendarFilterConfigRole = 'admin' | 'planner';
export type CalendarFilterConfig = {
  role: CalendarFilterConfigRole;
  functionalLocations: string[];
  statuses: string[];
  assignedResources: string[];
  workOrderTypes: string[];
  priorities: string[];
  updatedAt?: string | null;
  updatedBy?: string | null;
};
export type CalendarFilterConfigResponse = {
  item: CalendarFilterConfig;
  requestId?: string;
};
export function fetchCalendarFilterConfig(role: CalendarFilterConfigRole): Promise<CalendarFilterConfigResponse> {
  const q = new URLSearchParams({ role });
  return apiJson<CalendarFilterConfigResponse>(`/api/v1/work-orders/calendar-filter-config?${q.toString()}`, {
    method: 'GET',
  });
}
export function putCalendarFilterConfig(body: CalendarFilterConfig): Promise<CalendarFilterConfigResponse> {
  return apiJson<CalendarFilterConfigResponse>('/api/v1/work-orders/calendar-filter-config', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export type RescheduleWorkOrderBody = {
  targetDate: string; // YYYY-MM-DD
  reasonCode?: string | null;
  comment?: string | null;
};

export type RescheduleWorkOrderResponse = {
  item: {
    workOrderId: string;
    plannedStart: string;
    plannedFinish: string;
    reasonCode: string | null;
    comment: string | null;
    /** Block tone on calendar when moved (green|red|blue) */
    calendarTone: string;
  };
  requestId?: string;
};

export function postRescheduleWorkOrder(
  workOrderId: number,
  body: RescheduleWorkOrderBody
): Promise<RescheduleWorkOrderResponse> {
  return apiJson<RescheduleWorkOrderResponse>(`/api/v1/work-orders/${workOrderId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type SavePlanningBody = {
  workCenterPlanned?: string | null;
  assignedPerson?: string | null;
  priority?: string | null;
  plannedStart: string;
  plannedFinish: string;
};
export type SavePlanningResponse = {
  item: {
    workOrderId: string;
    workCenterPlanned: string | null;
    priority: string | null;
    assignedPerson: string | null;
    plannedStart: string;
    plannedFinish: string;
  };
  requestId?: string;
};
export function postSavePlanning(workOrderId: number, body: SavePlanningBody): Promise<SavePlanningResponse> {
  return apiJson<SavePlanningResponse>(`/api/v1/work-orders/${workOrderId}/planning`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type CloseWorkOrderBody = {
  /** @deprecated Prefer workCentersActual when selecting multiple technicians */
  workCenterActual?: string | null;
  /** One confirmation row per entry (same times and hours). */
  workCentersActual?: string[] | null;
  actualStart: string;
  actualFinish: string;
  actualWorkHours?: number | null;
  comment?: string | null;
};
export type CloseWorkOrderResponse = {
  item: {
    workOrderId: string;
    workCenterActual: string | null;
    actualStart: string;
    actualFinish: string;
    actualWorkHours: number;
    confirmationRowsCreated?: number;
  };
  requestId?: string;
};
export function postCloseWorkOrder(workOrderId: number, body: CloseWorkOrderBody): Promise<CloseWorkOrderResponse> {
  return apiJson<CloseWorkOrderResponse>(`/api/v1/work-orders/${workOrderId}/close-work-order`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type WorkOrderRescheduleHistoryRow = {
  id: string;
  workOrderId: string;
  actorUserId: string | null;
  actorName: string | null;
  from: {
    planned_start?: string | null;
    planned_finish?: string | null;
  } | null;
  to: {
    planned_start?: string | null;
    planned_finish?: string | null;
  } | null;
  reasonCode: string | null;
  comment: string | null;
  statusTone: string | null;
  createdAt: string;
};

export type WorkOrderRescheduleHistoryResponse = {
  items: WorkOrderRescheduleHistoryRow[];
  total: number;
  page: number;
  pageSize: number;
  requestId?: string;
};

export function fetchWorkOrderRescheduleHistory(
  page = 1,
  pageSize = 20,
  workOrderId?: string,
  from?: string,
  to?: string
): Promise<WorkOrderRescheduleHistoryResponse> {
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (workOrderId?.trim()) q.set('workOrderId', workOrderId.trim());
  if (from?.trim()) q.set('from', from.trim());
  if (to?.trim()) q.set('to', to.trim());
  return apiJson<WorkOrderRescheduleHistoryResponse>(`/api/v1/work-orders/reschedule-history?${q.toString()}`, {
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

export type TaskSheetAttachmentRow = {
  id: string;
  mimeType: string | null;
  byteSize: number | null;
  createdAt: string;
};

export type TaskSheetBundleResponse = {
  taskLogId: string | null;
  attachments: TaskSheetAttachmentRow[];
  requestId?: string;
};

/** Tab Task — task_logs.log_type = task_sheet + ไฟล์แนบ */
export function fetchTaskSheetBundle(workOrderId: number): Promise<TaskSheetBundleResponse> {
  return apiJson<TaskSheetBundleResponse>(`/api/v1/work-orders/${workOrderId}/task-sheet`, {
    method: 'GET',
  });
}

// --- F05 Confirm WO (รายการจากนำเข้า SAP + บันทึกในแอป) ---

export type ReasonCodeRow = {
  id: string | number;
  code: string;
  label_th: string | null;
  label_en: string | null;
  sort_order: number;
};

export type ReasonCodesResponse = {
  items: ReasonCodeRow[];
  requestId?: string;
};

export function fetchReasonCodes(): Promise<ReasonCodesResponse> {
  return apiJson<ReasonCodesResponse>('/api/v1/reason-codes', { method: 'GET' });
}

export type OrderConfirmationRow = {
  id: string | number;
  work_order_id: string | number;
  confirmed_by_user_id: string | number | null;
  confirmed_by_name: string | null;
  import_batch_id: string | number | null;
  sap_confirm_no: string | null;
  sap_counter: string | null;
  sap_line_key: string;
  actual_start: string | null;
  actual_finish: string | null;
  actual_work_hours: string | number | null;
  reason_code_id: string | number | null;
  reason_code: string | null;
  reason_label_th: string | null;
  notes: string | null;
  sync_to_sap_status: string;
  created_at: string | null;
};

export type OrderConfirmationsListResponse = {
  items: OrderConfirmationRow[];
  requestId?: string;
};

export function fetchOrderConfirmations(workOrderId: number): Promise<OrderConfirmationsListResponse> {
  return apiJson<OrderConfirmationsListResponse>(
    `/api/v1/work-orders/${workOrderId}/confirmations`,
    { method: 'GET' }
  );
}

export type CreateOrderConfirmationBody = {
  actualStart?: string | null;
  actualFinish?: string | null;
  actualWorkHours?: number | null;
  reasonCodeId?: number | null;
  notes?: string | null;
  syncToSapStatus?: 'pending' | 'not_applicable';
};

export type CreateOrderConfirmationResponse = {
  id: string;
  workOrderId: string;
  sapLineKey: string;
  syncToSapStatus: string;
  requestId?: string;
};

export function createOrderConfirmation(
  workOrderId: number,
  body: CreateOrderConfirmationBody
): Promise<CreateOrderConfirmationResponse> {
  return apiJson<CreateOrderConfirmationResponse>(
    `/api/v1/work-orders/${workOrderId}/confirmations`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}
