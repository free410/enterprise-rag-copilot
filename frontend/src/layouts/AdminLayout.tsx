import { useEffect, useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  FileTextOutlined,
  HistoryOutlined,
  LogoutOutlined,
  MessageOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Dropdown, Layout, Menu, Space, Typography, theme } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getMe } from '@/api/auth';
import { clearAuth, getCurrentUser, setCurrentUser, type AuthUser } from '@/utils/auth';

const { Header, Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  { key: '/dashboard', icon: <AppstoreOutlined />, label: '控制台' },
  { key: '/documents', icon: <FileTextOutlined />, label: '文档管理' },
  { key: '/chat', icon: <MessageOutlined />, label: '智能问答' },
  { key: '/history', icon: <HistoryOutlined />, label: '历史记录' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser());

  useEffect(() => {
    getMe()
      .then((profile) => {
        setCurrentUser(profile);
        setUser(profile);
      })
      .catch(() => {
        clearAuth();
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  const dropdownItems = useMemo<MenuProps['items']>(
    () => [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: () => {
          clearAuth();
          navigate('/login', { replace: true });
        },
      },
    ],
    [navigate],
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={248}
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #183b2b 100%)',
          boxShadow: '8px 0 24px rgba(15, 23, 42, 0.12)',
        }}
      >
        <div className="brand-block">
          <div className="brand-kicker">Enterprise AI</div>
          <div className="brand-title">RAG Copilot</div>
          <div className="brand-subtitle">企业内部知识与文档后台</div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            borderInlineEnd: 'none',
          }}
        />
      </Sider>
      <Layout>
        <Header
          className="admin-header"
          style={{
            padding: '16px 24px',
            height: 'auto',
            minHeight: 82,
            lineHeight: 'normal',
            background: 'rgba(255, 255, 255, 0.92)',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="admin-header-copy">
            <Typography.Title level={4} className="admin-header-title" style={{ margin: 0 }}>
              企业内部知识与文档 RAG Copilot
            </Typography.Title>
            <Typography.Text type="secondary" className="admin-header-subtitle">
              本地模型、知识接入、检索增强问答一体化后台
            </Typography.Text>
          </div>
          <Dropdown menu={{ items: dropdownItems }} placement="bottomRight">
            <Button type="text" style={{ height: 'auto', padding: 8 }}>
              <Space size={12}>
                <Avatar style={{ backgroundColor: '#14532d' }}>
                  {(user?.username ?? 'A').slice(0, 1).toUpperCase()}
                </Avatar>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>{user?.username ?? '管理员'}</div>
                  <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                    {user?.email ?? 'admin@example.local'}
                  </div>
                </div>
              </Space>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ padding: '28px 24px 32px' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminLayout;
