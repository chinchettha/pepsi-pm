import type { ReactNode } from 'react';
import { Button, Result, Typography } from 'antd';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import type { AppLocationState } from '../../config/navigationState';
import { useAuth } from '../auth/AuthContext';
import { getErrorCopy, normalizeErrorCode, type ErrorCode } from './errorCatalog';

const RELOAD_CODES = new Set<string>(['network', '500', '502', '503', '504']);

export function ErrorPage() {
  const { code: rawCode } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();

  const code = normalizeErrorCode(rawCode);
  const copy = getErrorCopy(code as ErrorCode);
  const detail = searchParams.get('detail');
  const state = location.state as AppLocationState | null;
  const deniedPath = state?.deniedPath;

  const extra: ReactNode[] = [];

  if (user) {
    extra.push(
      <Link key="home" to={ROUTES.home}>
        <Button type="primary">หน้าแรก</Button>
      </Link>
    );
  }

  if (!user || code === '401') {
    extra.push(
      <Link key="login" to={ROUTES.login}>
        <Button type={user ? 'default' : 'primary'}>เข้าสู่ระบบ</Button>
      </Link>
    );
  }

  if (RELOAD_CODES.has(code)) {
    extra.push(
      <Button key="reload" onClick={() => window.location.reload()}>
        โหลดใหม่
      </Button>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(165deg, #fff2e8 0%, #f5f5f5 45%, #ffffff 100%)',
      }}
    >
      <Result
        status={copy.resultStatus}
        title={copy.title}
        subTitle={
          <div style={{ maxWidth: 420 }}>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
              {copy.description}
            </Typography.Paragraph>
            {detail ? (
              <Typography.Paragraph>
                <Typography.Text type="danger" code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {detail}
                </Typography.Text>
              </Typography.Paragraph>
            ) : null}
            {deniedPath && code === '403' ? (
              <Typography.Paragraph type="secondary">
                เส้นทางที่ขอ: <Typography.Text code>{deniedPath}</Typography.Text>
              </Typography.Paragraph>
            ) : null}
          </div>
        }
        extra={<>{extra}</>}
      />
    </div>
  );
}
