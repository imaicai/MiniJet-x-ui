import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Drawer, Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  CloseOutlined,
  DashboardOutlined,
  ImportOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';

import { HttpUtil } from '@/utils';
import { useTheme } from '@/hooks/useTheme';
import './AppSidebar.css';

const LOGOUT_KEY = '__logout__';
const SIDER_WIDTH = 176;

export default function AppSidebar() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme: 'light' | 'dark' = isDark ? 'dark' : 'light';

  const navItems = useMemo<NonNullable<MenuProps['items']>>(
    () => [
      { key: '/', icon: <DashboardOutlined />, label: t('menu.dashboard') },
      { key: '/inbounds', icon: <ImportOutlined />, label: t('menu.inbounds') },
    ],
    [t],
  );

  const logoutItems = useMemo<NonNullable<MenuProps['items']>>(
    () => [{ key: LOGOUT_KEY, icon: <LogoutOutlined />, label: t('logout') }],
    [t],
  );

  const selectedKey = pathname === '' ? '/' : pathname;

  const openLink = useCallback(
    async (key: string) => {
      setDrawerOpen(false);
      if (key === LOGOUT_KEY) {
        await HttpUtil.post('/logout');
        window.location.href = window.X_UI_BASE_PATH || '/';
        return;
      }
      navigate(key);
    },
    [navigate],
  );

  const onMenuClick = useCallback<NonNullable<MenuProps['onClick']>>(
    ({ key }) => openLink(String(key)),
    [openLink],
  );

  const railStyle = { '--sider-rail': `${SIDER_WIDTH}px` } as CSSProperties;

  return (
    <>
      <button
        type="button"
        className="drawer-handle"
        onClick={() => setDrawerOpen(true)}
        aria-label="Menu"
      >
        <MenuOutlined />
      </button>

      <div className="ant-sidebar sidebar-pinned" style={railStyle}>
        <Layout.Sider theme={theme} width={SIDER_WIDTH}>
          <div className="sider-brand">
            <div className="brand-block">
              <span className="brand-text">MiniJet</span>
            </div>
          </div>
          <Menu
            theme={theme}
            mode="inline"
            selectedKeys={[selectedKey]}
            className="sider-nav"
            items={navItems}
            onClick={onMenuClick}
          />
          <Menu
            theme={theme}
            mode="inline"
            selectedKeys={[]}
            className="sider-utility"
            items={logoutItems}
            onClick={onMenuClick}
          />
        </Layout.Sider>
      </div>

      <Drawer
        open={drawerOpen}
        placement="left"
        width={240}
        closable={false}
        onClose={() => setDrawerOpen(false)}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
      >
        <div className="drawer-header">
          <span className="drawer-brand">MiniJet</span>
          <button
            type="button"
            className="drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close"
          >
            <CloseOutlined />
          </button>
        </div>
        <Menu
          theme={theme}
          mode="inline"
          selectedKeys={[selectedKey]}
          className="drawer-menu"
          items={navItems}
          onClick={onMenuClick}
        />
        <Menu
          theme={theme}
          mode="inline"
          selectedKeys={[]}
          className="drawer-menu drawer-utility"
          items={logoutItems}
          onClick={onMenuClick}
        />
      </Drawer>
    </>
  );
}
