import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { Button, Result, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';

type Props = { children: ReactNode };

type State = {
  hasError: boolean;
  message?: string;
};

/** จับ error ระหว่าง render — fallback หน้า 500 */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary]', error, info.componentStack);
    }
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: '#fff2f0',
          }}
        >
          <Result
            status="500"
            title="หน้าแสดงผิดพลาด"
            subTitle={
              <Typography.Paragraph type="secondary">
                เกิดข้อผิดพลาดระหว่างแสดงผล — ลองโหลดใหม่หรือกลับหน้าแรก
                {this.state.message ? (
                  <>
                    <br />
                    <Typography.Text code>{this.state.message}</Typography.Text>
                  </>
                ) : null}
              </Typography.Paragraph>
            }
            extra={[
              <Button key="reload" type="primary" onClick={() => window.location.reload()}>
                โหลดใหม่
              </Button>,
              <Link key="home" to={ROUTES.home}>
                <Button>หน้าแรก</Button>
              </Link>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
