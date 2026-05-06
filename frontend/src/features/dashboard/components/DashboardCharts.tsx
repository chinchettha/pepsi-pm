import type { CSSProperties } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Card, Col, Empty, Row, theme } from 'antd';
import type { DashboardStats } from '../api';
import { fillImportsByDaySeries } from '../api';

const PALETTE = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#eb2f96',
  '#722ed1',
  '#13c2c2',
  '#fa8c16',
  '#2f54eb',
  '#a0d911',
  '#f5222d',
];

type Props = {
  stats: DashboardStats | undefined;
  isLoading: boolean;
};

const chartBoxStyle: CSSProperties = {
  height: 280,
  position: 'relative',
};

export function DashboardCharts({ stats, isLoading }: Props) {
  const { token } = theme.useToken();
  const text = token.colorTextSecondary;
  const grid = token.colorSplit;

  const wo = stats?.workOrders;
  const byStatus = wo?.bySystemStatus ?? [];
  const doughnutData = {
    labels: byStatus.map((r) => r.status),
    datasets: [
      {
        data: byStatus.map((r) => r.count),
        backgroundColor: byStatus.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 1,
        borderColor: token.colorBgContainer,
      },
    ],
  };

  const kindRows = stats?.importsByKind ?? [];
  const barData = {
    labels: kindRows.map((r) => r.sourceKind),
    datasets: [
      {
        label: 'จำนวนไฟล์ (30 วัน)',
        data: kindRows.map((r) => r.count),
        backgroundColor: PALETTE[0],
        borderRadius: 4,
      },
    ],
  };

  const daySeries = fillImportsByDaySeries(stats?.importsByDay ?? []);
  const lineData = {
    labels: daySeries.map((d) => d.shortLabel),
    datasets: [
      {
        label: 'Imports / วัน',
        data: daySeries.map((d) => d.count),
        borderColor: PALETTE[0],
        backgroundColor: `${PALETTE[0]}33`,
        fill: true,
        tension: 0.25,
        pointRadius: 3,
      },
    ],
  };

  const commonOpts = {
    responsive: true,
    maintainAspectRatio: false as const,
    plugins: {
      legend: {
        labels: { color: text },
      },
    },
  };

  const lineOpts = {
    ...commonOpts,
    scales: {
      x: {
        ticks: { color: text, maxRotation: 45 },
        grid: { color: grid },
      },
      y: {
        beginAtZero: true,
        ticks: { color: text, stepSize: 1 },
        grid: { color: grid },
      },
    },
  };

  const barOpts = {
    ...commonOpts,
    scales: {
      x: {
        ticks: { color: text },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: text, stepSize: 1 },
        grid: { color: grid },
      },
    },
  };

  const doughnutOpts = {
    ...commonOpts,
    plugins: {
      ...commonOpts.plugins,
      legend: {
        position: 'right' as const,
        labels: { color: text, boxWidth: 12 },
      },
    },
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title="ใบงานตาม system status" loading={isLoading}>
          {!isLoading && (wo?.total ?? 0) === 0 ? (
            <Empty description="ยังไม่มีข้อมูล work orders" />
          ) : (
            <div style={chartBoxStyle}>
              <Doughnut data={doughnutData} options={doughnutOpts} />
            </div>
          )}
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="นำเข้าตามชนิด (30 วันล่าสุด)" loading={isLoading}>
          {!isLoading && kindRows.length === 0 ? (
            <Empty description="ยังไม่มี import ในช่วงนี้" />
          ) : (
            <div style={chartBoxStyle}>
              <Bar data={barData} options={barOpts} />
            </div>
          )}
        </Card>
      </Col>
      <Col span={24}>
        <Card title="จำนวน import รายวัน (14 วันล่าสุด)" loading={isLoading}>
          <div style={chartBoxStyle}>
            <Line data={lineData} options={lineOpts} />
          </div>
        </Card>
      </Col>
    </Row>
  );
}
