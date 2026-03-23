import { useState } from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { login } from '@/api/auth';
import { setAccessToken, setCurrentUser } from '@/utils/auth';

interface LoginFormValues {
  username: string;
  password: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const response = await login(values);
      setAccessToken(response.access_token);
      setCurrentUser(response.user);
      message.success('登录成功');
      navigate((location.state as { from?: string } | null)?.from ?? '/dashboard', {
        replace: true,
      });
    } catch (error) {
      void error;
      message.error('用户名或密码错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero login-equal-row">
        <div className="login-hero-panel login-equal-panel">
          <div className="login-kicker">Enterprise Knowledge Platform</div>
          <Typography.Title level={1} className="login-title">
            企业内部知识与文档 RAG Copilot
          </Typography.Title>
          <Typography.Paragraph className="login-description">
            面向研发协作、代码理解、文档检索与本地大模型问答的一体化后台系统。
          </Typography.Paragraph>
        </div>
        <Card className="login-card login-equal-panel" bordered={false}>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>
            管理员登录
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
            使用系统管理员账号进入控制台。
          </Typography.Paragraph>
          <Form<LoginFormValues> layout="vertical" onFinish={handleFinish} initialValues={{ username: 'admin' }}>
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input size="large" prefix={<UserOutlined />} placeholder="请输入管理员用户名" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="请输入登录密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
              登录并进入控制台
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
