import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Tag, Typography, message } from 'antd';
import { DatabaseOutlined, SaveOutlined, SettingOutlined } from '@ant-design/icons';
import { getSettings, saveSettings, type SystemSettings } from '@/api/settings';
import type { ChatProvider } from '@/api/chat';

interface SettingsFormValues {
  default_provider: ChatProvider;
  default_top_k: number;
  data_dir: string;
  index_dir: string;
}

function getProviderColor(provider: string) {
  const normalized = provider.toLowerCase();
  if (normalized === 'qwen') {
    return 'blue';
  }
  if (normalized === 'deepseek') {
    return 'purple';
  }
  if (normalized === 'llama') {
    return 'volcano';
  }
  if (normalized === 'mock') {
    return 'default';
  }
  return 'green';
}

function SettingsPage() {
  const [form] = Form.useForm<SettingsFormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    getSettings()
      .then((response) => {
        setSettings(response);
        form.setFieldsValue(response);
      })
      .catch(() => {
        message.error('获取系统设置失败');
      })
      .finally(() => setLoading(false));
  }, [form]);

  const handleSave = async (values: SettingsFormValues) => {
    setSaving(true);
    try {
      const response = await saveSettings(values);
      setSettings(response);
      form.setFieldsValue(response);
      message.success('系统设置已保存');
    } catch (error) {
      void error;
      message.error('保存系统设置失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-heading">
        <Typography.Title level={2} className="page-title">
          系统设置
        </Typography.Title>
        <Typography.Text type="secondary" className="page-description">
          管理默认问答参数与本地目录配置，让系统配置更清晰、更易维护。
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={16} style={{ display: 'flex' }}>
          <Card
            title="基础配置"
            extra={
              <Tag icon={<SettingOutlined />} color="default" style={{ marginInlineEnd: 0 }}>
                配置中心
              </Tag>
            }
            loading={loading}
            bordered={false}
            style={{
              width: '100%',
              borderRadius: 20,
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
            bodyStyle={{ padding: 22 }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={(values) => void handleSave(values)}
              requiredMark="optional"
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="默认 Provider"
                    name="default_provider"
                    style={{ marginBottom: 18 }}
                    rules={[{ required: true, message: '请选择默认 provider' }]}
                  >
                    <Select
                      size="large"
                      options={[
                        { label: 'Qwen', value: 'qwen' },
                        { label: 'DeepSeek', value: 'deepseek' },
                        { label: 'Llama', value: 'llama' },
                        { label: 'Mock', value: 'mock' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="默认 top_k"
                    name="default_top_k"
                    style={{ marginBottom: 18 }}
                    rules={[{ required: true, message: '请输入默认 top_k' }]}
                  >
                    <InputNumber min={1} max={10} size="large" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="数据目录"
                name="data_dir"
                style={{ marginBottom: 18 }}
                rules={[{ required: true, message: '请输入数据目录' }]}
              >
                <Input size="large" placeholder="例如：D:\\project\\backend\\data" />
              </Form.Item>

              <Form.Item
                label="索引目录"
                name="index_dir"
                style={{ marginBottom: 24 }}
                rules={[{ required: true, message: '请输入索引目录' }]}
              >
                <Input size="large" placeholder="例如：D:\\project\\backend\\data\\faiss" />
              </Form.Item>

              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
                保存设置
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={8} style={{ display: 'flex' }}>
          <Card
            title="当前生效值"
            extra={
              <Tag icon={<DatabaseOutlined />} color="green" style={{ marginInlineEnd: 0 }}>
                实时摘要
              </Tag>
            }
            loading={loading}
            bordered={false}
            style={{
              width: '100%',
              borderRadius: 20,
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
            bodyStyle={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: 'linear-gradient(180deg, #f9fcf9 0%, #eef5ef 100%)',
                border: '1px solid rgba(15, 23, 42, 0.06)',
              }}
            >
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>默认 Provider</div>
              <Tag color={getProviderColor(settings?.default_provider ?? '-')} style={{ fontSize: 14, paddingInline: 10 }}>
                {(settings?.default_provider ?? '-').toUpperCase()}
              </Tag>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: 'linear-gradient(180deg, #ffffff 0%, #f7faf7 100%)',
                border: '1px solid rgba(15, 23, 42, 0.06)',
              }}
            >
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>默认 top_k</div>
              <div style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 700, color: '#0f172a' }}>
                {settings?.default_top_k ?? '-'}
              </div>
            </div>

            <div className="overview-item" style={{ paddingTop: 0 }}>
              <div className="overview-label">数据目录</div>
              <div className="overview-value overview-mono">{settings?.data_dir ?? '-'}</div>
            </div>

            <div className="overview-item" style={{ paddingTop: 0 }}>
              <div className="overview-label">索引目录</div>
              <div className="overview-value overview-mono">{settings?.index_dir ?? '-'}</div>
            </div>

            <div className="overview-item" style={{ paddingTop: 0 }}>
              <div className="overview-label">最后更新时间</div>
              <div className="overview-value">
                {settings?.updated_at ? new Date(settings.updated_at).toLocaleString() : '-'}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

export default SettingsPage;
