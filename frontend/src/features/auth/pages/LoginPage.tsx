import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { ROUTES } from '../../../config/routes';
import { API_BASE_URL, DEV_AUTH_SECRET_PREFILL } from '../../../config/env';
import { ApiError } from '../../../api/client';
import { fetchDevToken } from '../api';
import { useAuth } from '../AuthContext';

function connectionHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (/fetch|network|failed/i.test(msg)) {
    return 'ตรวจว่า backend รันแล้ว และ URL ใน VITE_API_BASE_URL ตรงพอร์ต — ถ้าโดน CORS ให้ตั้ง CORS_ORIGIN บน backend ให้รวม origin ที่ใช้เปิดหน้า (เช่น ทั้ง localhost และ 127.0.0.1)';
  }
  return msg;
}

export function LoginPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { setAccessToken, isAuthenticated, authSessionError, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const isDev = import.meta.env.DEV;

  if (isAuthenticated) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(165deg, #e6f4ff 0%, #f5f5f5 42%, #ffffff 100%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>
            Pepsi PM
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 15 }}>
            เข้าสู่ระบบ
          </Typography.Text>
        </div>

        <Card
          variant="borderless"
          style={{
            borderRadius: 12,
            boxShadow: '0 8px 28px rgba(15, 23, 42, 0.08)',
          }}
        >
          {!authLoading && authSessionError ? (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 20 }}
              message="เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ"
              description={
                <>
                  ให้รัน backend จากโฟลเดอร์ <code>backend</code> ด้วย <code>npm run dev</code> และตรวจว่า
                  พอร์ตตรงกับ <code>{API_BASE_URL}</code>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                    {connectionHint(authSessionError)}
                  </Typography.Text>
                </>
              }
            />
          ) : null}

          <Form
            layout="vertical"
            requiredMark={false}
            size="large"
            initialValues={{
              gpid: 'demo',
              devSecret: DEV_AUTH_SECRET_PREFILL || undefined,
            }}
            onFinish={async (v: { gpid: string; devSecret: string }) => {
              setLoading(true);
              try {
                const res = await fetchDevToken(v.gpid.trim(), v.devSecret);
                await setAccessToken(res.accessToken);
                message.success('เข้าสู่ระบบสำเร็จ');
                navigate(ROUTES.home, { replace: true });
              } catch (e) {
                if (e instanceof ApiError) {
                  message.error(e.message);
                } else if (e instanceof Error) {
                  message.error(e.message);
                } else {
                  message.error('เข้าสู่ระบบไม่สำเร็จ');
                }
              } finally {
                setLoading(false);
              }
            }}
          >
            <Form.Item
              label="รหัสผู้ใช้ (GPID)"
              name="gpid"
              rules={[{ required: true, message: 'กรุณากรอกรหัสผู้ใช้' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
                autoComplete="username"
                placeholder="เช่น demo"
              />
            </Form.Item>
            <Form.Item
              label="รหัสผ่าน"
              name="devSecret"
              rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }]}
              extra={
                isDev ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    สภาพแวดล้อมพัฒนา: ใช้ค่า <Typography.Text code>DEV_AUTH_SECRET</Typography.Text> จากไฟล์{' '}
                    <Typography.Text code>.env</Typography.Text> ของ backend (ไม่ใช่รหัสผ่านผู้ใช้ในฐานข้อมูล)
                  </Typography.Text>
                ) : null
              }
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
                autoComplete="current-password"
                placeholder="รหัสผ่าน"
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                เข้าสู่ระบบ
              </Button>
            </Form.Item>
          </Form>

          <Alert
            type="info"
            showIcon
            message={
              <>
                ถ้า backend ตั้ง <Typography.Text code>SKIP_AUTH=true</Typography.Text> ไม่จำเป็นต้องล็อกอิน — ไป{' '}
                <Link to={ROUTES.home}>หน้าแรก</Link> ได้เลย
              </>
            }
            style={{ marginTop: 8 }}
          />

          <Typography.Paragraph type="secondary" style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 12 }}>
            API: <code>{API_BASE_URL}</code>
          </Typography.Paragraph>
        </Card>
      </div>
    </div>
  );
}
