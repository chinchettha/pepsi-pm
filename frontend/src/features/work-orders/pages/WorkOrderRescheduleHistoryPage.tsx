import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { App, Button, Card, DatePicker, Input, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { ROUTES } from '../../../config/routes';
import {
  fetchWorkOrderRescheduleHistory,
  type WorkOrderRescheduleHistoryRow,
} from '../api';

function fmt(s: string | null | undefined): string {
  if (!s) return '-';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('th-TH');
}

function toneTag(tone: string | null) {
  if (!tone) return <Tag>-</Tag>;
  const color = tone === 'green' ? 'green' : tone === 'red' ? 'red' : tone === 'blue' ? 'blue' : 'default';
  return <Tag color={color}>{tone}</Tag>;
}

export function WorkOrderRescheduleHistoryPage() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialWoId = searchParams.get('workOrderId') ?? '';
  const initialFrom = searchParams.get('from') ?? '';
  const initialTo = searchParams.get('to') ?? '';
  const [workOrderId, setWorkOrderId] = useState(initialWoId);
  const [fromDate, setFromDate] = useState<string>(initialFrom);
  const [toDate, setToDate] = useState<string>(initialTo);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const q = useQuery({
    queryKey: ['work-order-reschedule-history', page, pageSize, workOrderId, fromDate, toDate],
    queryFn: () =>
      fetchWorkOrderRescheduleHistory(
        page,
        pageSize,
        workOrderId || undefined,
        fromDate || undefined,
        toDate || undefined
      ),
  });

  const applySearch = (nextWoId: string, nextFrom: string, nextTo: string) => {
    setPage(1);
    const id = nextWoId.trim();
    const next: Record<string, string> = {};
    if (id) next.workOrderId = id;
    if (nextFrom) next.from = nextFrom;
    if (nextTo) next.to = nextTo;
    setSearchParams(next);
  };

  const columns: ColumnsType<WorkOrderRescheduleHistoryRow> = useMemo(
    () => [
      { title: 'เมื่อย้าย', dataIndex: 'createdAt', width: 160, render: (v: string) => fmt(v) },
      {
        title: 'WO',
        dataIndex: 'workOrderId',
        width: 110,
        render: (id: string) => <Link to={ROUTES.workOrders.detail(id)}>{id}</Link>,
      },
      { title: 'ผู้ดำเนินการ', key: 'actor', width: 150, render: (_, r) => r.actorName ?? r.actorUserId ?? '-' },
      { title: 'จาก Planned Start', key: 'fromStart', width: 160, render: (_, r) => fmt(r.from?.planned_start ?? null) },
      { title: 'เป็น Planned Start', key: 'toStart', width: 160, render: (_, r) => fmt(r.to?.planned_start ?? null) },
      { title: 'Reason', dataIndex: 'reasonCode', width: 90, render: (v: string | null) => v ?? '-' },
      { title: 'Comment', dataIndex: 'comment', ellipsis: true, render: (v: string | null) => v ?? '-' },
      { title: 'Tone', dataIndex: 'statusTone', width: 100, render: (v: string | null) => toneTag(v) },
    ],
    []
  );

  const escapeCsv = (v: unknown): string => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const exportCsv = async () => {
    try {
      const exportPageSize = 100;
      const first = await fetchWorkOrderRescheduleHistory(
        1,
        exportPageSize,
        workOrderId || undefined,
        fromDate || undefined,
        toDate || undefined
      );
      const all = [...first.items];
      const totalPages = Math.ceil((first.total || 0) / exportPageSize);
      for (let p = 2; p <= totalPages; p += 1) {
        const next = await fetchWorkOrderRescheduleHistory(
          p,
          exportPageSize,
          workOrderId || undefined,
          fromDate || undefined,
          toDate || undefined
        );
        all.push(...next.items);
      }

      const header = [
        'moved_at',
        'work_order_id',
        'actor_name',
        'from_planned_start',
        'to_planned_start',
        'from_planned_finish',
        'to_planned_finish',
        'reason_code',
        'comment',
        'status_tone',
      ];
      const lines = [
        header.join(','),
        ...all.map((r) =>
          [
            r.createdAt,
            r.workOrderId,
            r.actorName ?? r.actorUserId ?? '',
            r.from?.planned_start ?? '',
            r.to?.planned_start ?? '',
            r.from?.planned_finish ?? '',
            r.to?.planned_finish ?? '',
            r.reasonCode ?? '',
            r.comment ?? '',
            r.statusTone ?? '',
          ]
            .map(escapeCsv)
            .join(',')
        ),
      ];
      const csv = '\uFEFF' + lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const suffix = workOrderId?.trim() ? `wo-${workOrderId.trim()}` : 'all';
      const dateSuffix = fromDate || toDate ? `-${fromDate || 'any'}_to_${toDate || 'any'}` : '';
      a.href = url;
      a.download = `reschedule-history-${suffix}${dateSuffix}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success(`Export CSV สำเร็จ (${all.length} รายการ)`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Export CSV ไม่สำเร็จ');
    }
  };

  return (
    <Card
      title="ประวัติการย้ายแผนงาน (Planner History)"
      extra={<Link to={ROUTES.workOrders.list}>กลับหน้าใบงาน</Link>}
    >
      <Space style={{ marginBottom: 12 }} wrap>
        <Input
          placeholder="กรองด้วย Work Order ID"
          value={workOrderId}
          onChange={(e) => setWorkOrderId(e.target.value)}
          style={{ width: 220 }}
        />
        <DatePicker
          placeholder="From"
          value={fromDate ? dayjs(fromDate) : null}
          format="YYYY-MM-DD"
          onChange={(d: Dayjs | null) => setFromDate(d ? d.format('YYYY-MM-DD') : '')}
          allowClear
        />
        <DatePicker
          placeholder="To"
          value={toDate ? dayjs(toDate) : null}
          format="YYYY-MM-DD"
          onChange={(d: Dayjs | null) => setToDate(d ? d.format('YYYY-MM-DD') : '')}
          allowClear
        />
        <Button
          type="primary"
          onClick={() => applySearch(workOrderId, fromDate, toDate)}
        >
          ค้นหา
        </Button>
        <Button
          onClick={() => {
            const d = dayjs().format('YYYY-MM-DD');
            setFromDate(d);
            setToDate(d);
            applySearch(workOrderId, d, d);
          }}
        >
          Today
        </Button>
        <Button
          onClick={() => {
            const from = dayjs().startOf('week').format('YYYY-MM-DD');
            const to = dayjs().endOf('week').format('YYYY-MM-DD');
            setFromDate(from);
            setToDate(to);
            applySearch(workOrderId, from, to);
          }}
        >
          This Week
        </Button>
        <Button
          onClick={() => {
            const to = dayjs().format('YYYY-MM-DD');
            const from = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
            setFromDate(from);
            setToDate(to);
            applySearch(workOrderId, from, to);
          }}
        >
          Last 7 Days
        </Button>
        <Button
          onClick={() => {
            setWorkOrderId('');
            setFromDate('');
            setToDate('');
            applySearch('', '', '');
          }}
        >
          ล้าง
        </Button>
        <Button onClick={exportCsv}>Export CSV</Button>
      </Space>
      <Table<WorkOrderRescheduleHistoryRow>
        rowKey={(r) => r.id}
        loading={q.isLoading}
        columns={columns}
        dataSource={q.data?.items ?? []}
        pagination={{
          total: q.data?.total ?? 0,
          pageSize,
          current: page,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
      {q.isError ? <Typography.Text type="danger">{(q.error as Error).message}</Typography.Text> : null}
    </Card>
  );
}
