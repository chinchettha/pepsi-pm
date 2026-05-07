import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, DatePicker, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { ROUTES } from '../../../config/routes';
import { fetchDailyAssignmentReport, type WorkOrderRow } from '../../work-orders/api';

function uiMetaObj(w: WorkOrderRow): Record<string, unknown> {
  const raw = w.ui_metadata_json;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (raw as Record<string, unknown>) ?? {};
}

function assignedLabel(w: WorkOrderRow): string {
  const m = uiMetaObj(w);
  const planning = (m.planning as Record<string, unknown> | undefined) ?? {};
  const ap = planning.assignedPerson;
  if (typeof ap === 'string' && ap.trim()) return ap.trim();
  return w.work_center_planned?.trim() || w.work_center_actual?.trim() || '—';
}

function priorityLabel(w: WorkOrderRow): string {
  const m = uiMetaObj(w);
  const planning = (m.planning as Record<string, unknown> | undefined) ?? {};
  const p = planning.priority ?? m.priority;
  if (typeof p === 'string' && p.trim()) return p.trim();
  return '—';
}

function taskTitle(w: WorkOrderRow): string {
  const m = uiMetaObj(w);
  const candidates = [
    m.calendarTitle,
    m.functionDescription,
    m.equipmentDescription,
    m.headerDescription,
    m.description,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return w.order_number?.trim() || String(w.id);
}

function fmtDt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : '—';
}

export function DailyAssignmentReportPage() {
  const [picker, setPicker] = useState<Dayjs>(() => dayjs());
  const dateStr = picker.format('YYYY-MM-DD');

  const q = useQuery({
    queryKey: ['daily-assignment-report', dateStr],
    queryFn: () => fetchDailyAssignmentReport(dateStr),
    enabled: picker.isValid(),
  });

  const columns: ColumnsType<WorkOrderRow> = useMemo(
    () => [
      {
        title: 'Order #',
        dataIndex: 'order_number',
        width: 140,
        ellipsis: true,
        fixed: 'left',
        render: (text: string, row) => (
          <Link to={ROUTES.workOrders.detail(row.id)}>{text || row.id}</Link>
        ),
      },
      {
        title: 'Functional Location',
        dataIndex: 'equipment_id',
        width: 130,
        ellipsis: true,
        render: (v: string | null | undefined) => v?.trim() || '—',
      },
      {
        title: 'ประเภท',
        dataIndex: 'order_type',
        width: 88,
      },
      {
        title: 'SAP Status',
        dataIndex: 'system_status',
        width: 110,
        ellipsis: true,
      },
      {
        title: 'มอบหมาย (Assigned)',
        key: 'assigned',
        width: 180,
        ellipsis: true,
        render: (_, row) => assignedLabel(row),
      },
      {
        title: 'Priority',
        key: 'priority',
        width: 100,
        render: (_, row) => priorityLabel(row),
      },
      {
        title: 'งาน / รายละเอียด',
        key: 'title',
        ellipsis: true,
        render: (_, row) => taskTitle(row),
      },
      {
        title: 'Planned start',
        key: 'ps',
        width: 150,
        render: (_, row) => fmtDt(row.planned_start ?? null),
      },
      {
        title: 'Planned finish',
        key: 'pf',
        width: 150,
        render: (_, row) => fmtDt(row.planned_finish ?? null),
      },
    ],
    []
  );

  return (
    <Card
      title={
        <Space wrap>
          <Typography.Title level={4} style={{ margin: 0 }}>
            รายงานมอบหมายรายวัน
          </Typography.Title>
          <Typography.Text type="secondary">
            PM/CM ZB01–ZB05 — ชุดเดียวกับปฏิทิน F02 สำหรับวันที่เลือก
          </Typography.Text>
        </Space>
      }
    >
      <Space wrap align="center" style={{ marginBottom: 16 }}>
        <Typography.Text strong>วันที่</Typography.Text>
        <DatePicker value={picker} onChange={(d) => d && setPicker(d)} allowClear={false} />
        <Button onClick={() => setPicker(dayjs())}>วันนี้</Button>
        <Link to={ROUTES.workOrders.calendar}>
          <Button type="link">เปิดปฏิทินงาน →</Button>
        </Link>
      </Space>

      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        ข้อมูลจาก <Typography.Text code>GET /api/v1/work-orders/daily-assignment-report?date=…</Typography.Text> — ใบงานที่ช่วง{' '}
        <Typography.Text strong>planned</Typography.Text> ทับซ้อนกับวันที่เลือก
      </Typography.Paragraph>

      {q.data?.truncated ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="แสดงครบ 500 ใบแรกในวันนี้ — ถ้ามีมากกว่านั้นให้กรองเพิ่มหรือใช้ปฏิทิน"
        />
      ) : null}

      <Table<WorkOrderRow>
        rowKey={(r) => String(r.id)}
        loading={q.isLoading}
        columns={columns}
        dataSource={q.data?.items ?? []}
        pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: [25, 50, 100] }}
        scroll={{ x: 1200 }}
      />

      {q.isError ? (
        <Typography.Text type="danger" style={{ marginTop: 8, display: 'block' }}>
          {(q.error as Error)?.message ?? 'โหลดไม่สำเร็จ'}
        </Typography.Text>
      ) : null}
    </Card>
  );
}
