import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import {
  createOrderConfirmation,
  fetchOrderConfirmations,
  fetchReasonCodes,
  type OrderConfirmationRow,
} from '../api';
import { PERMISSIONS, userHasAnyPermission } from '../../../config/permissions';
import { useAuth } from '../../auth/AuthContext';

type Props = { workOrderId: number };

function formatDt(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

function formatHours(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function syncStatusTag(status: string) {
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: 'gold', label: 'รอส่ง SAP' },
    sent: { color: 'green', label: 'ส่ง SAP แล้ว' },
    failed: { color: 'red', label: 'ส่ง SAP ล้มเหลว' },
    not_applicable: { color: 'default', label: 'ไม่ส่ง SAP' },
  };
  const m = map[status] ?? { color: 'default', label: status };
  return <Tag color={m.color}>{m.label}</Tag>;
}

type FormValues = {
  actualStart: Dayjs | null;
  actualFinish: Dayjs | null;
  actualWorkHours: number | null;
  reasonCodeId?: number;
  notes?: string;
  syncToSapStatus: 'pending' | 'not_applicable';
};

export function WorkOrderConfirmPanel({ workOrderId }: Props) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { user } = useAuth();
  const canCreate = userHasAnyPermission(user, [PERMISSIONS.ORDER_CONFIRMATION_CREATE]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const qCodes = useQuery({
    queryKey: ['reason-codes'],
    queryFn: () => fetchReasonCodes(),
  });

  const qConf = useQuery({
    queryKey: ['work-order', workOrderId, 'confirmations'],
    queryFn: () => fetchOrderConfirmations(workOrderId),
  });

  const createMut = useMutation({
    mutationFn: (values: FormValues) =>
      createOrderConfirmation(workOrderId, {
        actualStart: values.actualStart?.toISOString() ?? null,
        actualFinish: values.actualFinish?.toISOString() ?? null,
        actualWorkHours: values.actualWorkHours ?? null,
        reasonCodeId: values.reasonCodeId ?? null,
        notes: values.notes?.trim() ? values.notes.trim() : null,
        syncToSapStatus: values.syncToSapStatus,
      }),
    onSuccess: () => {
      message.success('บันทึกการยืนยันแล้ว');
      setModalOpen(false);
      form.resetFields();
      void qc.invalidateQueries({ queryKey: ['work-order', workOrderId, 'confirmations'] });
    },
    onError: (e: unknown) => {
      message.error(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    },
  });

  const reasonOptions = useMemo(() => {
    const items = qCodes.data?.items ?? [];
    return items.map((r) => ({
      value: Number(r.id),
      label: r.label_th || r.code,
    }));
  }, [qCodes.data?.items]);

  const columns = useMemo(
    () => [
      {
        title: 'เมื่อบันทึก',
        key: 'created_at',
        render: (_: unknown, r: OrderConfirmationRow) => formatDt(r.created_at),
      },
      {
        title: 'แหล่งที่มา',
        key: 'src',
        render: (_: unknown, r: OrderConfirmationRow) =>
          r.import_batch_id != null ? <Tag>นำเข้า SAP</Tag> : <Tag color="blue">บันทึกในแอป</Tag>,
      },
      {
        title: 'ผู้ยืนยัน',
        key: 'by',
        render: (_: unknown, r: OrderConfirmationRow) =>
          r.confirmed_by_name ??
          (r.confirmed_by_user_id != null ? `#${r.confirmed_by_user_id}` : '—'),
      },
      {
        title: 'เริ่มจริง',
        key: 'as',
        render: (_: unknown, r: OrderConfirmationRow) => formatDt(r.actual_start),
      },
      {
        title: 'สิ้นสุดจริง',
        key: 'af',
        render: (_: unknown, r: OrderConfirmationRow) => formatDt(r.actual_finish),
      },
      {
        title: 'ชม. งาน',
        key: 'h',
        render: (_: unknown, r: OrderConfirmationRow) => formatHours(r.actual_work_hours),
      },
      {
        title: 'เหตุผล',
        key: 'reason',
        render: (_: unknown, r: OrderConfirmationRow) => r.reason_label_th ?? r.reason_code ?? '—',
      },
      {
        title: 'สถานะส่ง SAP',
        key: 'sync',
        render: (_: unknown, r: OrderConfirmationRow) => syncStatusTag(r.sync_to_sap_status),
      },
      {
        title: 'หมายเหตุ',
        key: 'notes',
        ellipsis: true,
        render: (_: unknown, r: OrderConfirmationRow) => r.notes ?? '—',
      },
    ],
    []
  );

  return (
    <Card
      title="การยืนยันใบงาน (Confirm WO)"
      extra={
        canCreate ? (
          <Button type="primary" onClick={() => setModalOpen(true)}>
            บันทึกการยืนยัน
          </Button>
        ) : null
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        แสดงทั้งแถวจากไฟล์ Confirm WO ที่นำเข้า และการยืนยันที่บันทึกในระบบ — สถานะส่ง SAP ใช้ติดตามการส่งกลับ SAP
        ตามขั้นตอนงาน
      </Typography.Paragraph>
      <Table<OrderConfirmationRow>
        rowKey={(r) => String(r.id)}
        loading={qConf.isLoading}
        dataSource={qConf.data?.items ?? []}
        columns={columns}
        pagination={false}
        size="small"
        locale={{ emptyText: 'ยังไม่มีข้อมูลการยืนยัน' }}
      />

      <Modal
        title="บันทึกการยืนยันใบงาน"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form<FormValues>
          form={form}
          layout="vertical"
          initialValues={{ syncToSapStatus: 'pending' }}
          onFinish={(values) => createMut.mutate(values)}
        >
          <Form.Item name="actualStart" label="เริ่มปฏิบัติงานจริง">
            <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="actualFinish" label="สิ้นสุดปฏิบัติงานจริง">
            <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="actualWorkHours" label="ชั่วโมงงานจริง">
            <InputNumber
              min={0}
              step={0.25}
              style={{ width: '100%' }}
              placeholder="ระบุเป็นตัวเลข (ถ้ามี)"
            />
          </Form.Item>
          <Form.Item name="reasonCodeId" label="เหตุผล / สาเหตุ">
            <Select
              allowClear
              placeholder="เลือกเหตุผล (ถ้ามี)"
              options={reasonOptions}
              loading={qCodes.isLoading}
            />
          </Form.Item>
          <Form.Item name="notes" label="หมายเหตุ">
            <Input.TextArea rows={3} maxLength={16000} showCount />
          </Form.Item>
          <Form.Item
            name="syncToSapStatus"
            label="การส่งข้อมูลกลับ SAP"
            rules={[{ required: true, message: 'ระบุตัวเลือก' }]}
          >
            <Radio.Group>
              <Radio value="pending">รอส่ง / ต้องส่ง SAP</Radio>
              <Radio value="not_applicable">ไม่ส่ง SAP (ไม่เกี่ยวข้อง)</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createMut.isPending}>
                บันทึก
              </Button>
              <Button onClick={() => setModalOpen(false)}>ยกเลิก</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
