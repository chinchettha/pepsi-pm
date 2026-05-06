import { Card, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../config/routes';

export function SapReportsPage() {
  return (
    <Card title="รายงาน SAP (placeholder)">
      <Typography.Paragraph>
        หน้านี้สำหรับรายงาน/ส่งออกจาก SAP ตามแผนโครง — ยังไม่เชื่อม API
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        ดูข้อมูล KPI ที่ materialize แล้วได้ที่{' '}
        <Link to={ROUTES.reportsKpi}>รายงาน KPI</Link> หรือ <Link to={ROUTES.dashboard}>แดชบอร์ด</Link>
      </Typography.Paragraph>
    </Card>
  );
}
