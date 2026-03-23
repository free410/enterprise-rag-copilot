import { useEffect, useMemo, useState } from 'react';
import { Card, Empty, Input, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CalendarOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import { getHistory, type HistoryItem } from '@/api/history';

type TimeFilterValue = 'all' | 'today' | '7d' | '30d';

function getModelColor(model: string) {
  const normalized = model.toLowerCase();
  if (normalized.includes('qwen')) {
    return 'blue';
  }
  if (normalized.includes('deepseek')) {
    return 'purple';
  }
  if (normalized.includes('llama')) {
    return 'volcano';
  }
  if (normalized.includes('mock')) {
    return 'default';
  }
  return 'green';
}

function getTimeFilterDate(value: TimeFilterValue) {
  const now = new Date();

  if (value === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (value === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (value === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return null;
}

function HistoryPage() {
  const [records, setRecords] = useState<HistoryItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>('all');

  useEffect(() => {
    getHistory()
      .then((response) => setRecords(response.items))
      .catch(() => {
        message.error('获取历史记录失败');
      })
      .finally(() => setLoading(false));
  }, []);

  const modelOptions = useMemo(() => {
    const models = Array.from(new Set(records.map((item) => item.model_used)));
    return [
      { label: '全部模型', value: 'all' },
      ...models.map((item) => ({ label: item, value: item })),
    ];
  }, [records]);

  const filteredRecords = useMemo(() => {
    const lowered = keyword.trim().toLowerCase();
    const timeLimit = getTimeFilterDate(timeFilter);

    return records.filter((item) => {
      const matchesKeyword =
        !lowered ||
        item.query.toLowerCase().includes(lowered) ||
        item.answer_summary.toLowerCase().includes(lowered) ||
        item.source_files.join(' ').toLowerCase().includes(lowered);

      const matchesModel = modelFilter === 'all' || item.model_used === modelFilter;
      const matchesTime = !timeLimit || new Date(item.created_at) >= timeLimit;

      return matchesKeyword && matchesModel && matchesTime;
    });
  }, [records, keyword, modelFilter, timeFilter]);

  const columns: ColumnsType<HistoryItem> = [
    {
      title: '提问',
      dataIndex: 'query',
      key: 'query',
      width: 280,
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Text strong ellipsis style={{ maxWidth: 240, display: 'inline-block' }}>
            {value}
          </Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '回答摘要',
      dataIndex: 'answer_summary',
      key: 'answer_summary',
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Paragraph
            ellipsis={{ rows: 2, tooltip: value }}
            style={{ marginBottom: 0, color: '#334155', minWidth: 280 }}
          >
            {value}
          </Typography.Paragraph>
        </Tooltip>
      ),
    },
    {
      title: '模型',
      dataIndex: 'model_used',
      key: 'model_used',
      width: 120,
      render: (value: string) => (
        <Tag color={getModelColor(value)} style={{ marginInlineEnd: 0 }}>
          {value}
        </Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (value: string) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(value).toLocaleString()}
        </Typography.Text>
      ),
    },
    {
      title: '来源文件',
      dataIndex: 'source_files',
      key: 'source_files',
      width: 260,
      render: (value: string[]) =>
        value.length > 0 ? (
          <Space wrap size={[6, 6]}>
            {value.map((item) => (
              <Tag key={item}>{item}</Tag>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">无来源文件</Typography.Text>
        ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-heading">
        <Typography.Title level={2} className="page-title">
          历史记录
        </Typography.Title>
        <Typography.Text type="secondary" className="page-description">
          查看最近问答记录、模型使用情况和来源文件，便于回溯知识检索与回答结果。
        </Typography.Text>
      </div>

      <Card
        bordered={false}
        style={{
          borderRadius: 20,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
        bodyStyle={{ padding: 18 }}
      >
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap size={12}>
            <Input
              allowClear
              value={keyword}
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="搜索提问、回答摘要或来源文件"
              style={{ width: 320, maxWidth: '100%' }}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Select
              value={modelFilter}
              options={modelOptions}
              style={{ width: 180 }}
              onChange={setModelFilter}
            />
            <Select
              value={timeFilter}
              style={{ width: 160 }}
              onChange={(value) => setTimeFilter(value)}
              options={[
                { label: '全部时间', value: 'all' },
                { label: '今天', value: 'today' },
                { label: '最近 7 天', value: '7d' },
                { label: '最近 30 天', value: '30d' },
              ]}
            />
          </Space>

          <Space size={16}>
            <Tag
              icon={<HistoryOutlined />}
              color="default"
              style={{
                paddingInline: 10,
                paddingBlock: 4,
                borderRadius: 999,
                marginInlineEnd: 0,
              }}
            >
              共 {records.length} 条记录
            </Tag>
            <Tag
              icon={<CalendarOutlined />}
              color="default"
              style={{
                paddingInline: 10,
                paddingBlock: 4,
                borderRadius: 999,
                marginInlineEnd: 0,
              }}
            >
              当前结果 {filteredRecords.length} 条
            </Tag>
          </Space>
        </Space>
      </Card>

      <Card
        bordered={false}
        title="问答历史"
        style={{
          borderRadius: 20,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
        bodyStyle={{ padding: 8 }}
      >
        <Table<HistoryItem>
          rowKey="id"
          columns={columns}
          dataSource={filteredRecords}
          loading={loading}
          size="middle"
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" size={4}>
                    <Typography.Text strong>暂无历史记录</Typography.Text>
                    <Typography.Text type="secondary">
                      去智能问答页发起一次提问后，这里会自动沉淀你的问答历史。
                    </Typography.Text>
                  </Space>
                }
              />
            ),
          }}
        />
      </Card>
    </Space>
  );
}

export default HistoryPage;
