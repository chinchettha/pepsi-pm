import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate } from 'react-router-dom';
import { ReloadOutlined } from '@ant-design/icons';
import { ROUTES } from '../../../config/routes';
import { fetchImportJobsList, type ImportJobListRow } from '../api';

function formatDt(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleString('th-TH');
}

function statusTag(status: string) {
  const colors: Record<string, string> = {
    pending: 'gold',
    running: 'processing',
    done: 'success',
    failed: 'error',
    cancelled: 'default',
  };
  return <Tag color={colors[status] ?? 'default'}>{status}</Tag>;
}

export function JobsHubPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [jumpId, setJumpId] = useState('');

  const offset = (page - 1) * pageSize;

  const q = useQuery({
    queryKey: ['import-jobs-list', pageSize, offset],
    queryFn: () => fetchImportJobsList(pageSize, offset),
  });

  const columns: ColumnsType<ImportJobListRow> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 72,
      render: (id: string | number) => (
        <Link to={ROUTES.jobs.detail(String(id))}>#{id}</Link>
      ),
    },
    { title: 'ประเภท', dataIndex: 'job_type', width: 130 },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => statusTag(s),
    },
    {
      title: 'ครั้ง',
      key: 'attempts',
      width: 88,
      render: (_: unknown, r) => `${r.attempts} / ${r.max_attempts}`,
    },
    {
      title: 'สร้างเมื่อ',
      dataIndex: 'created_at',
      width: 160,
      render: (v: string) => formatDt(v),
    },
    {
      title: 'เสร็จเมื่อ',
      dataIndex: 'finished_at',
      width: 160,
      render: (v: string | null) => formatDt(v),
    },
    {
      title: 'ข้อผิดพลาด',
      dataIndex: 'last_error',
      ellipsis: true,
      render: (v: string | null) => v ?? '—',
    },
  ];

  const goJump = () => {
    const id = jumpId.trim();
    if (!id) return;
    navigate(ROUTES.jobs.detail(id));
  };

  return (
    <Card
      title="ติดตามงาน (คิว)"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void q.refetch()}>
          รีเฟรช
        </Button>
      }
    >
      <Typography.Paragraph type="secondary">
        งาน normalize แบบ async และ KPI snapshot จะอยู่ในตาราง <code>import_jobs</code> — คลิก ID เพื่อดูรายละเอียด
        (polling อัตโนมัติในหน้ารายละเอียด)
      </Typography.Paragraph>
      <Typography.Paragraph>
        <Space.Compact style={{ maxWidth: 360, width: '100%' }}>
          <Input
            placeholder="ไปยัง job id"
            value={jumpId}
            onChange={(e) => setJumpId(e.target.value)}
            onPressEnter={goJump}
            aria-label="รหัสงานคิว"
          />
          <Button type="primary" onClick={goJump}>
            เปิด
          </Button>
        </Space.Compact>
      </Typography.Paragraph>
      {q.isError ? (
        <Typography.Text type="danger">{(q.error as Error).message}</Typography.Text>
      ) : null}
      <Table<ImportJobListRow>
        rowKey={(r) => String(r.id)}
        loading={q.isLoading}
        columns={columns}
        dataSource={q.data?.items ?? []}
        pagination={{
          total: q.data?.total ?? 0,
          pageSize,
          current: page,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 40],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        <Link to={ROUTES.import}>← นำเข้า SAP</Link>
      </Typography.Paragraph>
    </Card>
  );
}
