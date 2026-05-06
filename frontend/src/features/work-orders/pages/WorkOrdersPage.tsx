import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../config/routes';
import { fetchWorkOrders } from '../api';
import type { WorkOrderRow } from '../api';

const columns: ColumnsType<WorkOrderRow> = [
  { title: 'ID', dataIndex: 'id', width: 90 },
  {
    title: 'Order #',
    dataIndex: 'order_number',
    ellipsis: true,
    render: (text: string, row) => (
      <Link to={ROUTES.workOrders.detail(row.id)}>{text}</Link>
    ),
  },
  { title: 'Type', dataIndex: 'order_type', width: 100 },
  { title: 'Status', dataIndex: 'system_status', width: 120 },
  { title: 'Planned start', dataIndex: 'planned_start', width: 160 },
  { title: 'Planned finish', dataIndex: 'planned_finish', width: 160 },
];

export function WorkOrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const q = useQuery({
    queryKey: ['work-orders', page, pageSize],
    queryFn: () => fetchWorkOrders(page, pageSize),
  });

  return (
    <Card title="ใบงาน (Work orders)">
      <Typography.Paragraph type="secondary">
        ข้อมูลจาก <code>GET /api/v1/work-orders</code> — หลังนำเข้า SAP / normalize แล้วจะมีแถวในตาราง
      </Typography.Paragraph>
      <Table<WorkOrderRow>
        rowKey={(r) => String(r.id)}
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
      {q.isError ? (
        <Typography.Text type="danger">
          {(q.error as Error)?.message ?? 'โหลดไม่สำเร็จ'}
        </Typography.Text>
      ) : null}
    </Card>
  );
}
