import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Descriptions, Result, Space, Typography } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { evidenceWithWorkOrder, ROUTES } from '../../../config/routes';
import { ApiError } from '../../../api/client';
import { WorkOrderConfirmPanel } from '../components/WorkOrderConfirmPanel';
import { fetchWorkOrder } from '../api';

function formatCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

export function WorkOrderDetailPage() {
  const { workOrderId: idParam } = useParams<{ workOrderId: string }>();
  const navigate = useNavigate();

  const id = useMemo(() => {
    const n = Number(idParam);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [idParam]);

  const q = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => fetchWorkOrder(id!),
    enabled: id !== null,
  });

  if (id === null) {
    return (
      <Result
        status="404"
        title="ไม่พบใบงาน"
        subTitle="ลิงก์ไม่ถูกต้อง (ต้องเป็นตัวเลข)"
        extra={<Button onClick={() => navigate(ROUTES.workOrders.list)}>กลับรายการ</Button>}
      />
    );
  }

  if (q.isError) {
    const e = q.error;
    const is404 = e instanceof ApiError && e.status === 404;
    return (
      <Result
        status={is404 ? '404' : 'error'}
        title={is404 ? 'ไม่พบใบงาน' : 'โหลดไม่สำเร็จ'}
        subTitle={e instanceof Error ? e.message : 'Unknown error'}
        extra={
          <Space>
            <Button onClick={() => navigate(ROUTES.workOrders.list)}>กลับรายการ</Button>
            {!is404 ? (
              <Button type="primary" onClick={() => q.refetch()}>
                ลองอีกครั้ง
              </Button>
            ) : null}
          </Space>
        }
      />
    );
  }

  const item = q.data?.item;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space wrap align="center">
        <Link to={ROUTES.workOrders.list}>← รายการใบงาน</Link>
        <Link to={`${ROUTES.workOrders.rescheduleHistory}?workOrderId=${encodeURIComponent(String(id))}`}>
          ประวัติการย้ายแผนงาน
        </Link>
        <Typography.Title level={4} style={{ margin: 0 }}>
          ใบงาน #{id}
        </Typography.Title>
      </Space>

      <Card loading={q.isLoading}>
        {item ? (
          <>
            <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
              <Descriptions.Item label="Order #">{formatCell(item.order_number)}</Descriptions.Item>
              <Descriptions.Item label="ประเภท">{formatCell(item.order_type)}</Descriptions.Item>
              <Descriptions.Item label="System status">{formatCell(item.system_status)}</Descriptions.Item>
              <Descriptions.Item label="User status">{formatCell(item.user_status)}</Descriptions.Item>
              <Descriptions.Item label="Equipment">{formatCell(item.equipment_id)}</Descriptions.Item>
              <Descriptions.Item label="WC planned">{formatCell(item.work_center_planned)}</Descriptions.Item>
              <Descriptions.Item label="WC actual">{formatCell(item.work_center_actual)}</Descriptions.Item>
              <Descriptions.Item label="Planned start">{formatCell(item.planned_start)}</Descriptions.Item>
              <Descriptions.Item label="Planned finish">{formatCell(item.planned_finish)}</Descriptions.Item>
              <Descriptions.Item label="Basic start">{formatCell(item.basic_start)}</Descriptions.Item>
              <Descriptions.Item label="Basic finish">{formatCell(item.basic_finish)}</Descriptions.Item>
              <Descriptions.Item label="Last import batch">{formatCell(item.last_import_batch_id)}</Descriptions.Item>
              <Descriptions.Item label="สร้างเมื่อ">{formatCell(item.created_at)}</Descriptions.Item>
              <Descriptions.Item label="อัปเดต">{formatCell(item.updated_at)}</Descriptions.Item>
            </Descriptions>
            <Typography.Paragraph style={{ marginTop: 16 }} type="secondary">
              <Link to={evidenceWithWorkOrder(item.id)}>
                อัปโหลดหลักฐานรูป (ใส่ Work order ID นี้ให้อัตโนมัติ)
              </Link>
            </Typography.Paragraph>
          </>
        ) : null}
      </Card>
      {item ? <WorkOrderConfirmPanel workOrderId={Number(item.id)} /> : null}
    </Space>
  );
}
