import { useQuery } from '@tanstack/react-query';
import { Card, Col, Descriptions, Row, Space, Statistic, Typography } from 'antd';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../../../api/client';
import { canAccessAdminNav } from '../../../components/layout/navConfig';
import { ROUTES } from '../../../config/routes';
import { API_BASE_URL } from '../../../config/env';
import { staggerFadeIn } from '../../../lib/motion';
import { useAuth } from '../../auth/AuthContext';

type HealthResponse = { status?: string; apiVersion?: string };

export function HomePage() {
  const { user } = useAuth();

  useEffect(() => {
    staggerFadeIn('.anime-enter');
  }, []);

  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiJson<HealthResponse>('/api/v1/health', { method: 'GET' }),
    retry: 2,
  });

  return (
    <>
      <Row gutter={[16, 16]}>
      <Col xs={24} lg={12} className="anime-enter">
        <Card title="สถานะ API">
          <Statistic
            title="เชื่อมต่อ backend"
            value={health.isLoading ? '…' : health.isError ? 'ล้มเหลว' : 'ปกติ'}
            valueStyle={{ color: health.isError ? '#cf1322' : '#3f8600' }}
          />
          <Typography.Paragraph style={{ marginTop: 16 }} type="secondary">
            <code>{API_BASE_URL}</code>
          </Typography.Paragraph>
          {health.data ? (
            <Typography.Paragraph>
              <code>apiVersion: {health.data.apiVersion ?? '—'}</code>
            </Typography.Paragraph>
          ) : null}
          {health.isError ? (
            <Typography.Text type="danger">
              {(health.error as Error).message} — ตรวจว่า backend รันที่พอร์ต 5000 และ CORS
              ตรง <code>VITE_API_BASE_URL</code>
            </Typography.Text>
          ) : null}
        </Card>
      </Col>
      <Col xs={24} lg={12} className="anime-enter">
        <Card title="ผู้ใช้ปัจจุบัน (GET /auth/me)">
          {user ? (
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="id">{user.id}</Descriptions.Item>
              <Descriptions.Item label="gpid">{user.gpid}</Descriptions.Item>
              <Descriptions.Item label="permissions">
                {user.permissions.slice(0, 6).join(', ')}
                {user.permissions.length > 6 ? ' …' : ''}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Typography.Text type="warning">ยังไม่ได้ authenticate — ไปหน้า Login</Typography.Text>
          )}
        </Card>
      </Col>
      <Col span={24}>
        <Card title="ทางลัด (ครบ IA)" className="anime-enter">
          <Space direction="vertical">
            <Link to={ROUTES.dashboard}>แดชบอร์ด (Chart.js) →</Link>
            <Link to={ROUTES.reportsKpi}>รายงาน KPI (Highcharts) →</Link>
            <Link to={ROUTES.workOrders.list}>รายการใบงาน →</Link>
            <Link to={ROUTES.workOrders.calendar}>ปฏิทินงาน (ต้นแบบ) →</Link>
            <Link to={ROUTES.import}>นำเข้าข้อมูล SAP (IW37N / Confirm / GI / GR) →</Link>
            <Link to={ROUTES.jobs.hub}>ติดตามงานคิว →</Link>
            <Link to={ROUTES.evidence}>อัปโหลดหลักฐานรูป (WebP) →</Link>
            <Link to={ROUTES.sapReports}>รายงาน SAP (placeholder) →</Link>
            {canAccessAdminNav(user) ? (
              <Link to={ROUTES.admin.users}>จัดการผู้ใช้ (ต้นแบบ) →</Link>
            ) : null}
          </Space>
        </Card>
      </Col>
    </Row>
    </>
  );
}
