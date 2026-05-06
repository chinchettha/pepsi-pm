import { Button, Input, Space, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../config/routes';
import { PlaceholderPage } from '../../../components/PlaceholderPage';

export function JobsHubPlaceholderPage() {
  const navigate = useNavigate();
  const [jobId, setJobId] = useState('');

  const go = () => {
    const id = jobId.trim();
    if (!id) return;
    navigate(ROUTES.jobs.detail(id));
  };

  return (
    <PlaceholderPage
      title="ติดตามงาน (คิว)"
      tag="SYSTEM_FLOWS §I"
      summary="หลัง normalize แบบ async หรือสั่ง KPI snapshot จะได้ jobId — เปิด /jobs/:jobId เพื่อดูสถานะ"
    >
      <Typography.Paragraph>
        ไปยังงานที่มีรหัส:{' '}
        <Space.Compact style={{ maxWidth: 360, width: '100%' }}>
          <Input
            placeholder="jobId"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            onPressEnter={go}
            aria-label="รหัสงานคิว"
          />
          <Button type="primary" onClick={go}>
            เปิด
          </Button>
        </Space.Compact>
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        หรือใช้ลิงก์จากหน้านำเข้า SAP / แดชบอร์ดเมื่อระบบส่งกลับมา
      </Typography.Paragraph>
    </PlaceholderPage>
  );
}
