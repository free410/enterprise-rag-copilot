import { useEffect, useState } from 'react';
import { Card, Col, List, Row, Space, Statistic, Tag, Typography } from 'antd';
import { getDashboardSummary, type DashboardSummary } from '@/api/dashboard';

function getStatusColor(status: string) {
  const normalized = status.toLowerCase();
  if (['ok', 'ready', 'running', 'available'].includes(normalized)) {
    return 'success';
  }
  if (normalized === 'fallback') {
    return 'warning';
  }
  return 'default';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '暂无记录';
  }
  return new Date(value).toLocaleString();
}

function getRelativeText(value: string | null | undefined) {
  if (!value) {
    return '暂无';
  }

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }

  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardSummary()
      .then((response) => setSummary(response))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { key: 'total_documents', label: '文档总数', value: summary?.total_documents ?? 0 },
    { key: 'indexed_documents', label: '已建立索引文档', value: summary?.indexed_documents ?? 0 },
    { key: 'recent_question_count', label: '最近问答次数', value: summary?.recent_question_count ?? 0 },
    { key: 'total_chunks', label: '总切片数', value: summary?.total_chunks ?? 0 },
  ];

  const statusCards = [
    { key: 'backend_status', label: '后端服务状态', value: summary?.backend_status ?? '-' },
    { key: 'index_status', label: '索引状态', value: summary?.index_status ?? '-' },
    { key: 'model_status', label: '模型状态', value: summary?.model_status ?? '-' },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-heading">
        <Typography.Title level={2} className="page-title">
          控制台首页
        </Typography.Title>
        <Typography.Text type="secondary" className="page-description">
          聚合查看知识接入规模、系统可用性和近期活动，快速判断当前平台运行状态。
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        {statCards.map((item) => (
          <Col key={item.key} xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              loading={loading}
              style={{
                borderRadius: 20,
                background: 'linear-gradient(180deg, #ffffff 0%, #f7faf7 100%)',
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
              }}
              bodyStyle={{ padding: 22 }}
            >
              <Statistic
                title={<span style={{ color: '#64748b', fontSize: 13 }}>{item.label}</span>}
                value={item.value}
                valueStyle={{
                  fontSize: 34,
                  lineHeight: 1.1,
                  fontWeight: 700,
                  color: '#0f172a',
                  marginTop: 10,
                }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        bordered={false}
        loading={loading}
        title="系统状态"
        style={{
          borderRadius: 20,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
        bodyStyle={{ padding: 18 }}
      >
        <Row gutter={[16, 16]}>
          {statusCards.map((item) => (
            <Col key={item.key} xs={24} md={8} xl={6}>
              <Card
                size="small"
                bordered={false}
                style={{
                  height: '100%',
                  borderRadius: 16,
                  background: 'linear-gradient(180deg, #f9fcf9 0%, #eef5ef 100%)',
                }}
                bodyStyle={{ padding: 16 }}
              >
                <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>{item.label}</div>
                <Tag color={getStatusColor(item.value)} style={{ marginInlineEnd: 0 }}>
                  {item.value}
                </Tag>
              </Card>
            </Col>
          ))}

          <Col xs={24} md={24} xl={6}>
            <Card
              size="small"
              bordered={false}
              style={{
                height: '100%',
                borderRadius: 16,
                background: 'linear-gradient(180deg, #f9fcf9 0%, #eef5ef 100%)',
              }}
              bodyStyle={{ padding: 16 }}
            >
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>当前可用模型</div>
              <Space wrap size={[8, 8]}>
                {(summary?.available_models ?? []).map((model) => (
                  <Tag key={model} color={model === 'mock' ? 'default' : 'green'}>
                    {model}
                  </Tag>
                ))}
                {(summary?.available_models?.length ?? 0) === 0 ? <Tag>暂无</Tag> : null}
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={9} style={{ display: 'flex' }}>
          <Card
            title="最近上传文档"
            bordered={false}
            loading={loading}
            style={{
              width: '100%',
              borderRadius: 20,
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
            bodyStyle={{ padding: 0 }}
          >
            <List
              itemLayout="horizontal"
              locale={{ emptyText: '暂无文档' }}
              dataSource={summary?.recent_documents ?? []}
              renderItem={(item) => (
                <List.Item style={{ padding: '14px 20px' }}>
                  <List.Item.Meta
                    title={
                      <Space size={8} wrap>
                        <Typography.Text strong>{item.file_name}</Typography.Text>
                        <Tag>{item.file_type.toUpperCase()}</Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={2}>
                        <Typography.Text type="secondary">{item.title}</Typography.Text>
                        <Space size={8} wrap>
                          <Tag color={item.status === 'indexed' ? 'success' : 'processing'}>{item.status}</Tag>
                          <Typography.Text type="secondary">{getRelativeText(item.updated_at)}</Typography.Text>
                        </Space>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} xl={9} style={{ display: 'flex' }}>
          <Card
            title="最近问答"
            bordered={false}
            loading={loading}
            style={{
              width: '100%',
              borderRadius: 20,
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
            bodyStyle={{ padding: 0 }}
          >
            <List
              itemLayout="horizontal"
              locale={{ emptyText: '暂无问答记录' }}
              dataSource={summary?.recent_questions ?? []}
              renderItem={(item) => (
                <List.Item style={{ padding: '14px 20px' }}>
                  <List.Item.Meta
                    title={
                      <Typography.Text strong ellipsis={{ tooltip: item.query }}>
                        {item.query}
                      </Typography.Text>
                    }
                    description={
                      <Space size={8} wrap>
                        <Tag color="green">{item.model_used}</Tag>
                        <Typography.Text type="secondary">{getRelativeText(item.created_at)}</Typography.Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} xl={6} style={{ display: 'flex' }}>
          <Card
            title="最近索引活动"
            bordered={false}
            loading={loading}
            style={{
              width: '100%',
              borderRadius: 20,
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
            bodyStyle={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: 'linear-gradient(180deg, #f9fcf9 0%, #eef5ef 100%)',
              }}
            >
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 6 }}>最近索引更新时间</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
                {formatDateTime(summary?.last_indexed_at)}
              </div>
              <Typography.Text type="secondary">{getRelativeText(summary?.last_indexed_at)}</Typography.Text>
            </div>

            <div className="overview-item" style={{ paddingTop: 0 }}>
              <div className="overview-label">数据库状态</div>
              <div className="overview-value">{summary?.database_status ?? '-'}</div>
            </div>
            <div className="overview-item" style={{ paddingTop: 0 }}>
              <div className="overview-label">当前管理员</div>
              <div className="overview-value">{summary?.current_user ?? '-'}</div>
            </div>
            <div className="overview-item" style={{ paddingTop: 0 }}>
              <div className="overview-label">API 版本</div>
              <div className="overview-value">{summary?.api_version ?? '-'}</div>
            </div>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

export default DashboardPage;
