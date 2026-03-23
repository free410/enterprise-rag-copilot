import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { BulbOutlined, RobotOutlined, SearchOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { sendChatMessage, type ChatProvider, type ChatResponse } from '@/api/chat';

interface ChatFormValues {
  query: string;
  provider: ChatProvider;
  top_k: number;
}

function formatDuration(durationMs: number | null) {
  if (durationMs == null) {
    return '-';
  }
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  return `${(durationMs / 1000).toFixed(2)} s`;
}

function ChatPage() {
  const [form] = Form.useForm<ChatFormValues>();
  const queryValue = Form.useWatch('query', form);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [requestDurationMs, setRequestDurationMs] = useState<number | null>(null);
  const [submittedMeta, setSubmittedMeta] = useState<{ provider: ChatProvider; top_k: number } | null>(null);

  const sourceFileCount = useMemo(() => {
    if (!response) {
      return 0;
    }
    return new Set(response.source_files).size;
  }, [response]);

  const handleSubmit = async (values: ChatFormValues) => {
    setLoading(true);
    setErrorMessage('');
    setRequestDurationMs(null);
    setSubmittedMeta({
      provider: values.provider,
      top_k: values.top_k,
    });

    const startedAt = performance.now();

    try {
      const result = await sendChatMessage(values);
      setResponse(result);
      setRequestDurationMs(Math.round(performance.now() - startedAt));
      message.success('问答完成');
    } catch (error) {
      const nextMessage = '问答请求失败，请检查后端服务、索引状态或模型可用性。';
      setErrorMessage(nextMessage);
      setResponse(null);
      setRequestDurationMs(Math.round(performance.now() - startedAt));
      message.error(nextMessage);
      void error;
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || !String(queryValue ?? '').trim();

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-heading">
        <Typography.Title level={2} className="page-title">
          智能问答
        </Typography.Title>
        <Typography.Text type="secondary" className="page-description">
          面向企业知识库的 RAG Copilot 工作台，聚焦提问、答案生成和检索证据展示。
        </Typography.Text>
      </div>

      <Card
        bordered={false}
        style={{
          borderRadius: 20,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          background: 'linear-gradient(180deg, #ffffff 0%, #f7faf7 100%)',
        }}
        bodyStyle={{ padding: 18 }}
      >
        <Form<ChatFormValues>
          form={form}
          layout="vertical"
          initialValues={{ provider: 'mock', top_k: 4 }}
          onFinish={(values) => void handleSubmit(values)}
        >
          <Form.Item
            label="问题"
            name="query"
            rules={[{ required: true, message: '请输入问题内容' }]}
            style={{ marginBottom: 14 }}
          >
            <Input.TextArea
              rows={3}
              showCount
              maxLength={1000}
              placeholder="例如：请解释 chat 模块职责，或总结最近一次变更内容。"
              style={{ borderRadius: 14 }}
            />
          </Form.Item>

          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} md={8} xl={6}>
              <Form.Item label="模型 Provider" name="provider" style={{ marginBottom: 0 }}>
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
            <Col xs={24} md={8} xl={4}>
              <Form.Item label="召回数量 top_k" name="top_k" style={{ marginBottom: 0 }}>
                <InputNumber min={1} max={10} size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8} xl={6}>
              <Space wrap>
                <Tag icon={<RobotOutlined />} color="green">
                  当前适合企业知识问答
                </Tag>
                <Tag icon={<SearchOutlined />}>RAG 检索增强</Tag>
              </Space>
            </Col>
            <Col xs={24} xl={8}>
              <Button type="primary" htmlType="submit" size="large" loading={loading} disabled={isSubmitDisabled} block>
                开始问答
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      {errorMessage ? <Alert type="error" message={errorMessage} showIcon /> : null}

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={14} style={{ display: 'flex' }}>
          <Card
            title="最终回答"
            extra={response ? <Tag color="green">{response.model_used}</Tag> : null}
            bordered={false}
            style={{
              width: '100%',
              borderRadius: 20,
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
            bodyStyle={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <Space wrap size={[8, 8]}>
              <Tag icon={<RobotOutlined />} color="green">
                当前模型：{response?.model_used ?? submittedMeta?.provider ?? '-'}
              </Tag>
              <Tag icon={<SearchOutlined />}>top_k：{response?.top_k ?? submittedMeta?.top_k ?? '-'}</Tag>
              <Tag icon={<BulbOutlined />}>命中文档数：{sourceFileCount}</Tag>
              <Tag icon={<ThunderboltOutlined />}>响应时间：{formatDuration(requestDurationMs)}</Tag>
            </Space>

            <div
              style={{
                minHeight: 320,
                padding: 18,
                borderRadius: 16,
                background: 'linear-gradient(180deg, #fbfdfb 0%, #f4f8f5 100%)',
                border: '1px solid rgba(15, 23, 42, 0.06)',
              }}
            >
              {loading ? (
                <div
                  style={{
                    minHeight: 280,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Space direction="vertical" size={12} align="center">
                    <Spin size="large" />
                    <Typography.Text type="secondary">正在检索知识库并生成回答...</Typography.Text>
                  </Space>
                </div>
              ) : response ? (
                <Space direction="vertical" size={18} style={{ width: '100%' }}>
                  <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0, fontSize: 15, lineHeight: 1.85 }}>
                    {response.answer}
                  </Typography.Paragraph>

                  <div>
                    <Typography.Text strong>来源文件</Typography.Text>
                    <div style={{ marginTop: 10 }}>
                      <Space wrap size={[8, 8]}>
                        {response.source_files.map((file) => (
                          <Tag key={file}>{file}</Tag>
                        ))}
                      </Space>
                    </div>
                  </div>
                </Space>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction="vertical" size={4}>
                      <Typography.Text strong>等待提问</Typography.Text>
                      <Typography.Text type="secondary">
                        输入问题后，这里会展示 RAG 生成的最终回答和来源文件。
                      </Typography.Text>
                    </Space>
                  }
                />
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={10} style={{ display: 'flex' }}>
          <Card
            title="召回片段"
            extra={<Tag>{response?.retrieved_chunks.length ?? 0} 条</Tag>}
            bordered={false}
            style={{
              width: '100%',
              borderRadius: 20,
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
            bodyStyle={{ padding: 20 }}
          >
            {loading ? (
              <div
                style={{
                  minHeight: 320,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Space direction="vertical" size={12} align="center">
                  <Spin />
                  <Typography.Text type="secondary">正在加载召回片段...</Typography.Text>
                </Space>
              </div>
            ) : (response?.retrieved_chunks.length ?? 0) > 0 ? (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {response?.retrieved_chunks.map((item) => (
                  <Card
                    key={`${item.chunk_id}-${item.chunk_index}`}
                    size="small"
                    bordered={false}
                    style={{
                      borderRadius: 16,
                      background: 'linear-gradient(180deg, #fbfdfb 0%, #f4f8f5 100%)',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                    }}
                    bodyStyle={{ padding: 14 }}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space wrap size={[8, 8]}>
                        <Tag color="blue">{item.file_name}</Tag>
                        <Tag>chunk #{item.chunk_index}</Tag>
                        <Tag color="default">score {item.score.toFixed(4)}</Tag>
                      </Space>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {item.file_path}
                      </Typography.Text>
                      <Typography.Paragraph
                        style={{ marginBottom: 0, whiteSpace: 'pre-wrap', lineHeight: 1.75 }}
                        ellipsis={{ rows: 5, expandable: true, symbol: '展开' }}
                      >
                        {item.content}
                      </Typography.Paragraph>
                    </Space>
                  </Card>
                ))}
              </Space>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" size={4}>
                    <Typography.Text strong>暂无召回片段</Typography.Text>
                    <Typography.Text type="secondary">
                      提交问题后，这里会展示命中的知识片段和来源信息。
                    </Typography.Text>
                  </Space>
                }
              />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

export default ChatPage;
