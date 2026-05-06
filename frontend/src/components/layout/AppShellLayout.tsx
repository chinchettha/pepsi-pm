import {
  AppstoreOutlined,
  CalendarOutlined,
  CameraOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  HomeOutlined,
  LineChartOutlined,
  LogoutOutlined,
  MenuOutlined,
  SyncOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Button, Drawer, Grid, Layout, Menu, theme, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../features/auth/AuthContext';
import { canAccessAdminNav, getSelectedNavKey } from './navConfig';

const { Header, Content, Sider } = Layout;

export function AppShellLayout() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  const selected = [getSelectedNavKey(loc.pathname)];
  const showAdmin = canAccessAdminNav(user);

  const menuItems: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = [
      { key: ROUTES.home, icon: <HomeOutlined />, label: 'หน้าแรก' },
      { key: ROUTES.workOrders.list, icon: <UnorderedListOutlined />, label: 'ใบงาน' },
      { key: ROUTES.workOrders.calendar, icon: <CalendarOutlined />, label: 'ปฏิทินงาน' },
      { key: ROUTES.import, icon: <CloudUploadOutlined />, label: 'นำเข้า SAP' },
      { key: ROUTES.jobs.hub, icon: <SyncOutlined />, label: 'ติดตามงาน (คิว)' },
      { key: ROUTES.dashboard, icon: <AppstoreOutlined />, label: 'แดชบอร์ด' },
      { key: ROUTES.reportsKpi, icon: <LineChartOutlined />, label: 'รายงาน KPI' },
      { key: ROUTES.sapReports, icon: <FileTextOutlined />, label: 'รายงาน SAP' },
      { key: ROUTES.evidence, icon: <CameraOutlined />, label: 'หลักฐานรูป' },
    ];
    if (showAdmin) {
      items.push({
        key: ROUTES.admin.users,
        icon: <TeamOutlined />,
        label: 'จัดการผู้ใช้',
      });
    }
    return items;
  }, [showAdmin]);

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
    if (isMobile) setMobileMenuOpen(false);
  };

  const menu = (
    <>
      <div style={{ padding: 16 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Pepsi PM
        </Typography.Title>
      </div>
      <Menu mode="inline" selectedKeys={selected} items={menuItems} onClick={onMenuClick} />
    </>
  );

  const contentMargin = isMobile ? 12 : 24;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile ? (
        <Sider
          width={220}
          theme="light"
          style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
        >
          {menu}
        </Sider>
      ) : null}

      <Drawer
        placement="left"
        width={280}
        title="เมนู"
        open={isMobile && mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        styles={{ body: { padding: 0 } }}
      >
        {menu}
      </Drawer>

      <Layout>
        <Header
          style={{
            padding: `0 ${contentMargin}px`,
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {isMobile ? (
            <Button
              type="text"
              icon={<MenuOutlined />}
              aria-label="เปิดเมนู"
              onClick={() => setMobileMenuOpen(true)}
            />
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Typography.Text type="secondary" ellipsis style={{ maxWidth: isMobile ? 120 : 'none' }}>
              {user?.gpid ?? '—'}
            </Typography.Text>
            <Button
              type="link"
              icon={<LogoutOutlined />}
              aria-label="ออกจากระบบ"
              onClick={() => logout()}
            >
              {!isMobile ? 'ออกจากระบบ' : undefined}
            </Button>
          </div>
        </Header>
        <Content
          className="app-shell-content"
          style={{
            margin: contentMargin,
            paddingBottom: contentMargin,
            minHeight: 'calc(100vh - 64px - var(--safe-bottom, 0px))',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
