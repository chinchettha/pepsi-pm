import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Empty, Select, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ROUTES } from '../../../config/routes';
import { fetchKpiSnapshots, type KpiMetricsV1 } from '../../dashboard/api';

function asMetrics(m: unknown): KpiMetricsV1 | null {
  if (!m || typeof m !== 'object') return null;
  return m as KpiMetricsV1;
}

function columnOptions(
  title: string,
  categories: string[],
  values: number[],
  color: string
): Highcharts.Options {
  return {
    chart: { type: 'column' },
    title: { text: title },
    xAxis: { categories, title: { text: undefined } },
    yAxis: { min: 0, title: { text: 'จำนวน' } },
    series: [
      {
        type: 'column',
        name: 'จำนวน',
        data: values,
        color,
      },
    ],
    credits: { enabled: false },
    legend: { enabled: false },
  };
}

export function ReportsKpiPage() {
  const q = useQuery({
    queryKey: ['reports', 'kpi-snapshots', 120],
    queryFn: () => fetchKpiSnapshots({ limit: 120 }),
  });

  const plants = useMemo(() => {
    const s = new Set<string>();
    for (const it of q.data?.items ?? []) s.add(it.plant);
    return [...s].sort();
  }, [q.data?.items]);

  const [plantFilter, setPlantFilter] = useState<string | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const filtered = useMemo(() => {
    const items = q.data?.items ?? [];
    if (plantFilter === 'all') return items;
    return items.filter((i) => i.plant === plantFilter);
  }, [q.data?.items, plantFilter]);

  useEffect(() => {
    setSelectedId(undefined);
  }, [plantFilter]);

  const active = useMemo(() => {
    if (!filtered.length) return undefined;
    if (selectedId) return filtered.find((x) => x.id === selectedId) ?? filtered[0];
    return filtered[0];
  }, [filtered, selectedId]);

  const metrics = asMetrics(active?.metrics);
  const wo = metrics?.workOrdersBySystemStatus ?? {};
  const woCats = Object.keys(wo);
  const woVals = woCats.map((k) => Number(wo[k] ?? 0));

  const gm = metrics?.goodsMovementsByKind ?? {};
  const gmCats = Object.keys(gm);
  const gmVals = gmCats.map((k) => Number(gm[k] ?? 0));

  const snapshotOptions = filtered.map((i) => ({
    value: i.id,
    label: `${i.snapshotDate} · plant “${i.plant || '(ว่าง)'}” · WO ${asMetrics(i.metrics)?.workOrderTotal ?? '—'}`,
  }));

  const primary = '#1677ff';
  const secondary = '#52c41a';

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space wrap align="center">
        <Link to={ROUTES.dashboard}>← แดชบอร์ด</Link>
        <Typography.Title level={4} style={{ margin: 0 }}>
          รายงาน KPI (Highcharts)
        </Typography.Title>
      </Space>

      <Typography.Paragraph type="secondary">
        เลือก snapshot จากตาราง <Typography.Text code>kpi_daily_snapshots</Typography.Text> — ข้อมูลมาจาก job{' '}
        <Typography.Text code>kpi_snapshot</Typography.Text> หลัง worker รัน
      </Typography.Paragraph>

      <Card loading={q.isLoading}>
        <Space wrap style={{ marginBottom: 16 }}>
          <span>Plant:</span>
          <Select
            style={{ minWidth: 160 }}
            value={plantFilter}
            onChange={(v) => setPlantFilter(v)}
            options={[
              { value: 'all', label: 'ทั้งหมด' },
              ...plants.map((p) => ({ value: p, label: p === '' ? '(ว่าง)' : p })),
            ]}
          />
          <span>Snapshot:</span>
          <Select
            style={{ minWidth: 360 }}
            placeholder="เลือกวันที่ snapshot"
            value={active?.id}
            onChange={(v) => setSelectedId(v)}
            options={snapshotOptions}
            disabled={!filtered.length}
          />
        </Space>

        {!q.isLoading && !filtered.length ? (
          <Empty description="ไม่มี snapshot ในระบบ" />
        ) : metrics && (woCats.length > 0 || gmCats.length > 0) ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {active ? (
              <Typography.Text type="secondary">
                generatedAt: {metrics.generatedAt ?? '—'} · workOrderTotal:{' '}
                {metrics.workOrderTotal ?? '—'}
              </Typography.Text>
            ) : null}
            {woCats.length > 0 ? (
              <div style={{ minHeight: 320 }}>
                <HighchartsReact
                  highcharts={Highcharts}
                  options={columnOptions(
                    'ใบงานตาม system status (KPI snapshot)',
                    woCats,
                    woVals,
                    primary
                  )}
                />
              </div>
            ) : (
              <Empty description="ไม่มี workOrdersBySystemStatus ใน metrics" />
            )}
            {gmCats.length > 0 ? (
              <div style={{ minHeight: 320 }}>
                <HighchartsReact
                  highcharts={Highcharts}
                  options={columnOptions(
                    'Goods movements ตามชนิด (GI / GR)',
                    gmCats,
                    gmVals,
                    secondary
                  )}
                />
              </div>
            ) : (
              <Empty description="ไม่มี goodsMovementsByKind ใน metrics" />
            )}
          </Space>
        ) : !q.isLoading && active ? (
          <Empty description="metrics_json ว่างหรือรูปแบบไม่รู้จัก" />
        ) : null}
      </Card>
    </Space>
  );
}
