import { useQuery } from '@tanstack/react-query';
import { Card, Empty, theme, Typography } from 'antd';
import { Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../config/routes';
import { fetchKpiSnapshots, type KpiMetricsV1 } from '../api';

type Props = {
  /** ถ้ากำหนด จะกรอง snapshot ตาม plant (ว่าง string = โรง default) */
  plant?: string;
};

function metricsTotal(m: unknown): number {
  if (!m || typeof m !== 'object') return 0;
  const t = (m as KpiMetricsV1).workOrderTotal;
  return typeof t === 'number' ? t : 0;
}

export function KpiTrendChart({ plant }: Props) {
  const { token } = theme.useToken();
  const q = useQuery({
    queryKey: ['dashboard', 'kpi-snapshots', 'trend', plant ?? 'all', 90],
    queryFn: () => fetchKpiSnapshots({ plant, limit: 90 }),
  });

  const chronological = [...(q.data?.items ?? [])].reverse();
  const labels = chronological.map((r) => r.snapshotDate);
  const totals = chronological.map((r) => metricsTotal(r.metrics));

  const data = {
    labels,
    datasets: [
      {
        label: 'work_order_total (จาก KPI snapshot)',
        data: totals,
        borderColor: token.colorPrimary,
        backgroundColor: `${token.colorPrimary}33`,
        fill: true,
        tension: 0.25,
        pointRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false as const,
    plugins: {
      legend: { labels: { color: token.colorTextSecondary } },
    },
    scales: {
      x: {
        ticks: { color: token.colorTextSecondary, maxRotation: 45 },
        grid: { color: token.colorSplit },
      },
      y: {
        beginAtZero: true,
        ticks: { color: token.colorTextSecondary },
        grid: { color: token.colorSplit },
      },
    },
  };

  return (
    <Card
      title="แนวโน้ม KPI (kpi_daily_snapshots)"
      loading={q.isLoading}
      extra={
        <Link to={ROUTES.reportsKpi}>รายงานละเอียด (Highcharts) →</Link>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        ข้อมูลหลังรัน <Typography.Text code>POST /api/v1/jobs/kpi-snapshot</Typography.Text> และ worker
        materialize ลงตาราง
      </Typography.Paragraph>
      {!q.isLoading && chronological.length === 0 ? (
        <Empty description="ยังไม่มี snapshot — รัน job KPI แล้วให้ worker ประมวลผล" />
      ) : (
        <div style={{ height: 280, position: 'relative' }}>
          <Line data={data} options={options} />
        </div>
      )}
    </Card>
  );
}
