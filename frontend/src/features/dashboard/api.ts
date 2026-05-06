import { apiJson } from '../../api/client';

export type DashboardStats = {
  workOrders: {
    total: number;
    bySystemStatus: { status: string; count: number }[];
  };
  importsByDay: { date: string; count: number }[];
  importsByKind: { sourceKind: string; count: number }[];
};

/** เติมวันที่ไม่มีข้อมูลเป็น 0 — ใช้เวลาท้องถิ่น */
export function fillImportsByDaySeries(
  points: { date: string; count: number }[],
  dayCount = 14
): { date: string; count: number; shortLabel: string }[] {
  const map = new Map(points.map((p) => [p.date, p.count]));
  const out: { date: string; count: number; shortLabel: string }[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    out.push({
      date: key,
      count: map.get(key) ?? 0,
      shortLabel: `${d.getDate()}/${d.getMonth() + 1}`,
    });
  }
  return out;
}

export function fetchDashboardStats(): Promise<DashboardStats & { requestId?: string }> {
  return apiJson<DashboardStats & { requestId?: string }>('/api/v1/dashboard/stats', {
    method: 'GET',
  });
}

/** โครง metrics ที่ materialize จาก `runKpiSnapshot` (backend) */
export type KpiMetricsV1 = {
  generatedAt?: string;
  workOrderTotal?: number;
  workOrdersBySystemStatus?: Record<string, number>;
  goodsMovementsByKind?: Record<string, number>;
};

export type KpiSnapshotRow = {
  id: string;
  snapshotDate: string;
  plant: string;
  metrics: KpiMetricsV1 | Record<string, unknown> | null;
  createdAt: string;
};

export type KpiSnapshotsResponse = {
  items: KpiSnapshotRow[];
  requestId?: string;
};

export function fetchKpiSnapshots(options?: {
  plant?: string;
  limit?: number;
}): Promise<KpiSnapshotsResponse> {
  const q = new URLSearchParams();
  if (options?.limit != null) q.set('limit', String(options.limit));
  if (options?.plant !== undefined) q.set('plant', options.plant);
  const suffix = q.toString() ? `?${q}` : '';
  return apiJson<KpiSnapshotsResponse>(`/api/v1/dashboard/kpi-snapshots${suffix}`, {
    method: 'GET',
  });
}
