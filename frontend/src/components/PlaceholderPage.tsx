import type { ReactNode } from 'react';
import { Alert, Space, Typography } from 'antd';

const { Title, Paragraph, Link } = Typography;

export type PlaceholderDocLink = { label: string; href: string };

type Props = {
  title: string;
  /** แท็กสั้น ๆ เช่น F02 / prototype */
  tag?: string;
  /** คำอธิบายใต้หัวข้อ */
  summary?: string;
  docLinks?: PlaceholderDocLink[];
  children?: ReactNode;
};

/** หน้าต้นแบบ IA — โครงเดียวกันทุกฟีเจอร์ที่ยังไม่ลงรายละเอียด */
export function PlaceholderPage({ title, tag, summary, docLinks, children }: Props) {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 960 }}>
      <div className="placeholder-page-header anime-enter">
        <Title level={3} style={{ marginBottom: tag ? 8 : 0 }}>
          {title}
          {tag ? (
            <>
              {' '}
              <Typography.Text type="secondary">({tag})</Typography.Text>
            </>
          ) : null}
        </Title>
        {summary ? <Paragraph type="secondary">{summary}</Paragraph> : null}
      </div>
      <Alert
        className="anime-enter"
        type="info"
        showIcon
        message="ต้นแบบ IA — ครบ route / เมนู"
        description="หน้านี้ยึดโครงและข้อความนำทางก่อน — ต่อ API และ UX ตาม PHASE_STATUS / SRS"
      />
      {docLinks?.length ? (
        <Paragraph>
          เอกสารอ้างอิง:{' '}
          {docLinks.map((d, i) => (
            <span key={d.href}>
              {i > 0 ? ' · ' : null}
              <Link href={d.href} target="_blank" rel="noreferrer">
                {d.label}
              </Link>
            </span>
          ))}
        </Paragraph>
      ) : null}
      {children}
    </Space>
  );
}
