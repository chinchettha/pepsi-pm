import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Alert,
  Button,
  Card,
  Modal,
  notification,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Typography,
  Upload,
} from 'antd';
import {
  CloudUploadOutlined,
  ReloadOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { ROUTES } from '../../../config/routes';
import { ApiError } from '../../../api/client';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchImportBatchErrors,
  fetchImportBatches,
  postNormalizeBatch,
  postNormalizeBatchAsync,
  postSapImport,
} from '../api';
import type { ImportBatchRow, ImportErrorRow, ImportKind } from '../types';

const KIND_META: Record<ImportKind, { label: string; hint: string }> = {
  iw37n: {
    label: 'IW37N',
    hint: 'Export IW37N — ไฟล์ .xls / .xlsx (สูงสุด ~50MB ตาม backend)',
  },
  confirm_wo: {
    label: 'Confirm WO',
    hint: 'Confirm WO / PC50 Y2018 Confirm — .xls / .xlsx',
  },
  gi: { label: 'GI', hint: 'Goods issue — export GI*.xls / .xlsx' },
  gr: { label: 'GR', hint: 'Goods receipt — export GR*.xls / .xlsx' },
};

function formatDt(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

export function DataImportPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<ImportKind>('iw37n');
  const [files, setFiles] = useState<Partial<Record<ImportKind, UploadFile>>>({});
  const [errorsBatchId, setErrorsBatchId] = useState<number | null>(null);

  const canImport =
    user?.permissions.includes('*') ?? false ? true : user?.permissions.includes('import.run') ?? false;

  const batchesQuery = useQuery({
    queryKey: ['import-batches', 50],
    queryFn: () => fetchImportBatches(50),
  });

  const errorsQuery = useQuery({
    queryKey: ['import-errors', errorsBatchId],
    queryFn: () => fetchImportBatchErrors(errorsBatchId!),
    enabled: errorsBatchId !== null,
  });

  const uploadMut = useMutation({
    mutationFn: ({ kind, file }: { kind: ImportKind; file: File }) => postSapImport(kind, file),
    onSuccess: (data, vars) => {
      message.success(
        `อัปโหลดแล้ว — batch ${data.batchId} · รับ ${data.rowCountAccepted} แถว · ตัดทิ้ง ${data.rowCountRejected}`
      );
      setFiles((prev) => {
        const next = { ...prev };
        delete next[vars.kind];
        return next;
      });
      void qc.invalidateQueries({ queryKey: ['import-batches'] });
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        message.error(`${e.message}${e.requestId ? ` (${e.requestId})` : ''}`);
      } else if (e instanceof Error) {
        message.error(e.message);
      }
    },
  });

  const normMut = useMutation({
    mutationFn: (batchId: number) => postNormalizeBatch(batchId),
    onSuccess: (data) => {
      message.success(
        `Normalize สำเร็จ — WO ${data.workOrdersUpserted}, GM ${data.goodsMovementsInserted}, OC ${data.orderConfirmationsInserted}, ข้าม ${data.rowsSkipped}`
      );
      void qc.invalidateQueries({ queryKey: ['import-batches'] });
      void qc.invalidateQueries({ queryKey: ['work-orders'] });
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) message.error(e.message);
      else if (e instanceof Error) message.error(e.message);
    },
  });

  const asyncMut = useMutation({
    mutationFn: (batchId: number) => postNormalizeBatchAsync(batchId),
    onSuccess: (data) => {
      notification.success({
        message: 'ใส่คิว normalize แล้ว',
        description: `${data.message} — รัน worker แยก terminal`,
        btn: (
          <Button type="primary" size="small" onClick={() => navigate(ROUTES.jobs.detail(data.jobId))}>
            ดูสถานะ job
          </Button>
        ),
      });
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) message.error(e.message);
      else if (e instanceof Error) message.error(e.message);
    },
  });

  const batchColumns: ColumnsType<ImportBatchRow> = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', width: 72 },
      { title: 'ชนิด', dataIndex: 'source_kind', width: 100 },
      { title: 'ไฟล์', dataIndex: 'source_file_name', ellipsis: true },
      { title: 'สถานะ', dataIndex: 'status', width: 110 },
      {
        title: 'รับ/ตัด',
        key: 'counts',
        width: 100,
        render: (_, r) => `${r.row_count_accepted ?? 0} / ${r.row_count_rejected ?? 0}`,
      },
      { title: 'เริ่ม', dataIndex: 'started_at', width: 160, render: (v: string) => formatDt(v) },
      {
        title: 'การทำงาน',
        key: 'actions',
        width: 280,
        render: (_, r) => (
          <Space size="small" wrap>
            <Popconfirm
              title="Normalize ทันที?"
              description="รันใน request เดียว — ไฟล์ใหญ่อาจใช้เวลา"
              onConfirm={() => normMut.mutate(r.id)}
              okText="รัน"
              cancelText="ยกเลิก"
            >
              <Button size="small" icon={<SyncOutlined />} loading={normMut.isPending}>
                Normalize
              </Button>
            </Popconfirm>
            <Popconfirm
              title="ใส่คิว worker?"
              description="ต้องรัน npm run worker แยก terminal"
              onConfirm={() => asyncMut.mutate(r.id)}
              okText="คิว"
              cancelText="ยกเลิก"
            >
              <Button size="small" icon={<ThunderboltOutlined />} loading={asyncMut.isPending}>
                Async
              </Button>
            </Popconfirm>
            <Button size="small" onClick={() => setErrorsBatchId(r.id)}>
              ข้อผิดพลาด
            </Button>
          </Space>
        ),
      },
    ],
    [asyncMut, normMut]
  );

  const errorColumns: ColumnsType<ImportErrorRow> = [
    { title: 'แถว', dataIndex: 'source_row_number', width: 72 },
    { title: 'รหัส', dataIndex: 'error_code', width: 120 },
    { title: 'ข้อความ', dataIndex: 'error_message', ellipsis: true },
  ];

  return (
    <>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        นำเข้าข้อมูล SAP
      </Typography.Title>

      {!canImport ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="บัญชีนี้ไม่มีสิทธิ์ import.run"
          description="ต้องได้รับสิทธิ์จากผู้ดูแลระบบ หรือใช้บัญชีที่มี role admin"
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Card style={{ marginBottom: 16 }}>
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k as ImportKind)}
          items={(Object.keys(KIND_META) as ImportKind[]).map((kind) => ({
            key: kind,
            label: KIND_META[kind].label,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Typography.Text type="secondary">{KIND_META[kind].hint}</Typography.Text>
                <Upload.Dragger
                  maxCount={1}
                  accept=".xls,.xlsx"
                  disabled={!canImport || uploadMut.isPending}
                  fileList={files[kind] ? [files[kind]!] : []}
                  beforeUpload={(file) => {
                    setFiles((prev) => ({
                      ...prev,
                      [kind]: {
                        uid: file.uid,
                        name: file.name,
                        status: 'done',
                        originFileObj: file,
                      },
                    }));
                    return false;
                  }}
                  onRemove={() => {
                    setFiles((prev) => {
                      const n = { ...prev };
                      delete n[kind];
                      return n;
                    });
                  }}
                >
                  <p className="ant-upload-drag-icon">
                    <CloudUploadOutlined />
                  </p>
                  <p className="ant-upload-text">ลากไฟล์หรือคลิกเลือก</p>
                </Upload.Dragger>
                <Button
                  type="primary"
                  disabled={!canImport || !files[kind]?.originFileObj || uploadMut.isPending}
                  loading={uploadMut.isPending}
                  onClick={() => {
                    const f = files[kind]?.originFileObj;
                    if (!f) return;
                    uploadMut.mutate({ kind, file: f });
                  }}
                >
                  ส่งไฟล์ไป staging
                </Button>
              </Space>
            ),
          }))}
        />
      </Card>

      <Card
        title="รายการ import ล่าสุด"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => void batchesQuery.refetch()}>
            รีเฟรช
          </Button>
        }
      >
        <Table<ImportBatchRow>
          rowKey={(r) => String(r.id)}
          loading={batchesQuery.isLoading}
          columns={batchColumns}
          dataSource={batchesQuery.data?.items ?? []}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={errorsBatchId ? `ข้อผิดพลาด — batch ${errorsBatchId}` : 'ข้อผิดพลาด'}
        open={errorsBatchId !== null}
        onCancel={() => setErrorsBatchId(null)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Table<ImportErrorRow>
          size="small"
          rowKey={(r) => String(r.id)}
          loading={errorsQuery.isLoading}
          columns={errorColumns}
          dataSource={errorsQuery.data?.items ?? []}
          pagination={{ pageSize: 8 }}
        />
      </Modal>
    </>
  );
}
