import { useQuery } from '@tanstack/react-query';
import { Card, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../config/routes';
import { fetchImportBatches } from '../../data-import/api';
import type { ImportBatchRow } from '../../data-import/types';

const KIND_LABEL: Record<string, string> = {
  iw37n: 'IW37N',
  confirm_wo: 'Confirm WO',
  gi: 'GI',
  gr: 'GR',
};

function formatDt(s: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('th-TH');
}

export function SapReportsPage() {
  const q = useQuery({
    queryKey: ['sap-reports-batches', 80],
    queryFn: () => fetchImportBatches(80),
  });

  const columns: ColumnsType<ImportBatchRow> = [
    {
      title: 'Batch',
      dataIndex: 'id',
      width: 80,
      render: (id: string | number) => <Link to={ROUTES.import}>#{id}</Link>,
    },
    {
      title: 'ชนิด',
      dataIndex: 'source_kind',
      width: 100,
      render: (k: string) => KIND_LABEL[k] ?? k,
    },
    {
      title: 'ไฟล์',
      dataIndex: 'source_file_name',
      ellipsis: true,
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <Tag>{s}</Tag>,
    },
    {
      title: 'รับ / ตัด',
      key: 'rows',
      width: 100,
      render: (_: unknown, r) => `${r.row_count_accepted} / ${r.row_count_rejected}`,
    },
    {
      title: 'เริ่ม',
      dataIndex: 'started_at',
      width: 150,
      render: (v: string | null) => formatDt(v),
    },
    {
      title: 'จบ',
      dataIndex: 'finished_at',
      width: 150,
      render: (v: string | null) => formatDt(v),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="ศูนย์รายงาน / ข้อมูล SAP">
        <Typography.Paragraph>
          หน้านี้รวม <strong>ประวัตินำเข้าไฟล์ SAP</strong> ล่าสุด (IW37N, Confirm, GI, GR) และลิงก์ไปเครื่องมือที่ใช้งานได้แล้ว
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          การส่งออกเทมเพลตหรือดึงรายงานกลับ SAP แบบ F08 ยังต้องล็อกรูปแบบกับทีม SAP — ตอนนี้ใช้{' '}
          <Link to={ROUTES.import}>นำเข้าข้อมูล SAP</Link>,{' '}
          <Link to={ROUTES.workOrders.list}>ใบงาน</Link>,{' '}
          <Link to={ROUTES.reportsKpi}>รายงาน KPI</Link> และ{' '}
          <Link to={ROUTES.dashboard}>แดชบอร์ด</Link> เป็นหลัก
        </Typography.Paragraph>
      </Card>

      <Card title="รอบนำเข้าล่าสุด">
        {q.isError ? (
          <Typography.Text type="danger">{(q.error as Error).message}</Typography.Text>
        ) : null}
        <Table<ImportBatchRow>
          rowKey={(r) => String(r.id)}
          loading={q.isLoading}
          columns={columns}
          dataSource={q.data?.items ?? []}
          pagination={false}
          size="small"
          locale={{ emptyText: 'ยังไม่มี batch — ไปที่หน้านำเข้า SAP' }}
        />
      </Card>
    </Space>
  );
}
