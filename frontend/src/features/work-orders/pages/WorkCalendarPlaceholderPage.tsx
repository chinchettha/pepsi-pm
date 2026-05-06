import { Typography } from 'antd';
import { PlaceholderPage } from '../../../components/PlaceholderPage';

export function WorkCalendarPlaceholderPage() {
  return (
    <PlaceholderPage
      title="ปฏิทินงาน"
      tag="F02 · prototype IA"
      summary="มุมมองเดือน/สัปดาห์ ลากวางงาน สีตามสถานะ Reason code — ตาม PM Application Requirement (Details) Rev.1"
    >
      <Typography.Paragraph>
        โครง route: <Typography.Text code>/work-orders/calendar</Typography.Text> — แยกจากรายการใบงานเพื่อ IA ชัดเจน
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        ชุดกราฟที่มีในโปรเจกต์: Chart.js (แดชบอร์ด) · Highcharts (รายงาน KPI) — ปฏิทินอาจใช้ปฏิทิน Ant Design +
        drag layer ภายหลัง
      </Typography.Paragraph>
    </PlaceholderPage>
  );
}
