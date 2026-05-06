import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { App, Button, Card, Col, DatePicker, Input, Row, Space, Statistic, Table, Typography } from 'antd';
import { Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { fetchImportBatches } from '../../data-import/api';
import { postKpiSnapshot } from '../../jobs/api';
import { ROUTES } from '../../../config/routes';
import { ApiError } from '../../../api/client';
import { fetchDashboardStats } from '../api';
import { DashboardCharts } from '../components/DashboardCharts';
import { KpiTrendChart } from '../components/KpiTrendChart';
import '../registerCharts';

export function DashboardPage() {
  const { message } = App.useApp();
  const [snapshotDate, setSnapshotDate] = useState<Dayjs>(() => dayjs());
  const [kpiPlant, setKpiPlant] = useState('');

  const kpiMut = useMutation({
    mutationFn: () =>
      postKpiSnapshot({
        snapshotDate: snapshotDate.format('YYYY-MM-DD'),
        plant: kpiPlant.trim(),
      }),
    onSuccess: (data) => {
      message.success(`คิวงาน KPI snapshot #${data.jobId} แล้ว`);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) message.error(e.message);
      else if (e instanceof Error) message.error(e.message);
    },
  });
  const statsQ = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
  });

  const batches = useQuery({
    queryKey: ['dashboard', 'batches'],
    queryFn: () => fetchImportBatches(8),
  });

  const woTotal = statsQ.data?.workOrders.total;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        แดชบอร์ด
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Work orders (ทั้งหมด)"
              value={woTotal ?? '—'}
              loading={statsQ.isLoading}
            />
            <Link to={ROUTES.workOrders.list}>ดูรายการ →</Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Import batches (ดึงล่าสุด)"
              value={batches.data?.items.length ?? 0}
              suffix="รายการ"
              loading={batches.isLoading}
            />
            <Link to={ROUTES.import}>นำเข้า SAP →</Link>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title="หลักฐานรูป" value="อัปโหลด" />
            <Link to={ROUTES.evidence}>ไปหน้าอัปโหลด →</Link>
          </Card>
        </Col>
      </Row>

      <DashboardCharts stats={statsQ.data} isLoading={statsQ.isLoading} />

      <Card title="สั่ง KPI snapshot (คิวงาน)">
        <Typography.Paragraph type="secondary">
          เรียก <Typography.Text code>POST /api/v1/jobs/kpi-snapshot</Typography.Text> — worker จะ materialize{' '}
          <Typography.Text code>kpi_daily_snapshots</Typography.Text> ตามวันที่และ plant
        </Typography.Paragraph>
        <Space wrap align="start">
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">วันที่ snapshot</Typography.Text>
            <DatePicker value={snapshotDate} onChange={(d) => d && setSnapshotDate(d)} />
          </Space>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">Plant (ว่าง = ทั้งหมด)</Typography.Text>
            <Input
              placeholder="เช่น A001"
              maxLength={16}
              style={{ width: 160 }}
              value={kpiPlant}
              onChange={(e) => setKpiPlant(e.target.value)}
            />
          </Space>
          <Button type="primary" loading={kpiMut.isPending} onClick={() => kpiMut.mutate()}>
            ส่งคิว
          </Button>
        </Space>
        {kpiMut.data ? (
          <Typography.Paragraph style={{ marginTop: 12 }}>
            <Link to={`/jobs/${kpiMut.data.jobId}`}>ดูสถานะ job #{kpiMut.data.jobId} →</Link>
          </Typography.Paragraph>
        ) : null}
      </Card>

      <KpiTrendChart />

      {statsQ.isError ? (
        <Typography.Text type="danger">{(statsQ.error as Error).message}</Typography.Text>
      ) : null}

      <Card title="Import ล่าสุด (ย่อ)">
        <Table
          size="small"
          rowKey={(r) => String(r.id)}
          pagination={false}
          loading={batches.isLoading}
          dataSource={batches.data?.items ?? []}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 64 },
            { title: 'ชนิด', dataIndex: 'source_kind', width: 100 },
            { title: 'ไฟล์', dataIndex: 'source_file_name', ellipsis: true },
            { title: 'สถานะ', dataIndex: 'status', width: 100 },
          ]}
        />
      </Card>
    </Space>
  );
}
