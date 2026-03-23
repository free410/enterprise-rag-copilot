import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CloudDownloadOutlined,
  CodeOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileMarkdownOutlined,
  FileTextOutlined,
  InboxOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  deleteDocument,
  getCnDemoSourceOptions,
  getDocuments,
  getFetchCnDemoTaskStatus,
  reindexDocuments,
  startFetchCnDemoTask,
  uploadDocument,
  type DemoSourceOption,
  type DocumentItem,
  type FetchCnDemoTaskStatusResponse,
} from '@/api/documents';

interface FetchConfigValues {
  site_keys: string[];
  custom_urls_text: string;
}

function getFileTypeVisual(fileType: string) {
  const normalized = fileType.toLowerCase();
  if (normalized === 'md' || normalized === 'markdown') {
    return {
      icon: <FileMarkdownOutlined />,
      color: 'geekblue',
      label: 'Markdown',
    };
  }

  if (normalized === 'json') {
    return {
      icon: <CodeOutlined />,
      color: 'purple',
      label: 'JSON',
    };
  }

  return {
    icon: <FileTextOutlined />,
    color: 'default',
    label: normalized.toUpperCase(),
  };
}

function getStatusVisual(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === 'indexed') {
    return { color: 'success', label: '已建立索引' };
  }
  if (normalized === 'processing') {
    return { color: 'processing', label: '处理中' };
  }
  if (normalized === 'failed') {
    return { color: 'error', label: '失败' };
  }
  if (normalized === 'pending') {
    return { color: 'warning', label: '待处理' };
  }

  return { color: 'default', label: status };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [startingFetchTask, setStartingFetchTask] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [fetchConfigOpen, setFetchConfigOpen] = useState(false);
  const [fetchProgressOpen, setFetchProgressOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [keyword, setKeyword] = useState('');
  const [sourceOptions, setSourceOptions] = useState<DemoSourceOption[]>([]);
  const [loadingSourceOptions, setLoadingSourceOptions] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<FetchCnDemoTaskStatusResponse | null>(null);
  const [taskError, setTaskError] = useState('');
  const notifiedTaskRef = useRef<Set<string>>(new Set());
  const [fetchForm] = Form.useForm<FetchConfigValues>();

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await getDocuments();
      setDocuments(response.items);
    } catch (error) {
      void error;
      message.error('获取文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchSourceOptions = async () => {
    setLoadingSourceOptions(true);
    try {
      const response = await getCnDemoSourceOptions();
      setSourceOptions(response.items);
      fetchForm.setFieldsValue({
        site_keys: response.items.filter((item) => item.default_selected).map((item) => item.key),
      });
    } catch (error) {
      void error;
      message.error('获取中国站点列表失败');
    } finally {
      setLoadingSourceOptions(false);
    }
  };

  useEffect(() => {
    void fetchDocuments();
  }, []);

  useEffect(() => {
    if (!fetchConfigOpen || sourceOptions.length > 0) {
      return;
    }
    void fetchSourceOptions();
  }, [fetchConfigOpen, sourceOptions.length]);

  useEffect(() => {
    if (!activeTaskId) {
      return;
    }

    let stopped = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const nextStatus = await getFetchCnDemoTaskStatus(activeTaskId);
        if (stopped) {
          return;
        }

        setTaskStatus(nextStatus);
        setTaskError('');

        if (nextStatus.status === 'completed') {
          if (!notifiedTaskRef.current.has(activeTaskId)) {
            notifiedTaskRef.current.add(activeTaskId);
            message.success('中国站点资料抓取、入库和索引构建已完成。');
            void fetchDocuments();
          }
          return;
        }

        if (nextStatus.status === 'failed') {
          if (!notifiedTaskRef.current.has(activeTaskId)) {
            notifiedTaskRef.current.add(activeTaskId);
            message.error(nextStatus.error_message ?? '抓取任务失败');
          }
          return;
        }

        timer = window.setTimeout(() => {
          void poll();
        }, 1500);
      } catch (error) {
        if (stopped) {
          return;
        }
        setTaskError('抓取状态轮询失败，请稍后重试。');
        timer = window.setTimeout(() => {
          void poll();
        }, 3000);
        void error;
      }
    };

    void poll();

    return () => {
      stopped = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [activeTaskId]);

  const filteredDocuments = useMemo(() => {
    if (!keyword.trim()) {
      return documents;
    }

    const lowered = keyword.toLowerCase();
    return documents.filter(
      (item) =>
        item.file_name.toLowerCase().includes(lowered) ||
        item.file_path.toLowerCase().includes(lowered) ||
        item.title.toLowerCase().includes(lowered),
    );
  }, [documents, keyword]);

  const indexedCount = useMemo(
    () => documents.filter((item) => item.status.toLowerCase() === 'indexed').length,
    [documents],
  );

  const handleUpload = async () => {
    if (!selectedFile) {
      message.warning('请先选择要上传的文档。');
      return;
    }

    setUploading(true);
    try {
      await uploadDocument(selectedFile);
      message.success(`文档 ${selectedFile.name} 上传成功`);
      setUploadModalOpen(false);
      setSelectedFile(null);
      await fetchDocuments();
    } catch (error) {
      void error;
      message.error('文档上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const result = await reindexDocuments();
      message.success(`索引构建完成：扫描 ${result.scanned_files} 个文件，生成 ${result.vector_count} 个向量。`);
      await fetchDocuments();
    } catch (error) {
      void error;
      message.error('重新构建索引失败');
    } finally {
      setReindexing(false);
    }
  };

  const handleOpenFetchConfig = () => {
    setFetchConfigOpen(true);
    setTaskError('');
  };

  const handleStartFetchTask = async () => {
    try {
      const values = await fetchForm.validateFields();
      const customUrls = values.custom_urls_text
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

      setStartingFetchTask(true);
      const response = await startFetchCnDemoTask({
        site_keys: values.site_keys ?? [],
        custom_urls: customUrls,
      });

      setActiveTaskId(response.task_id);
      setTaskStatus(null);
      setTaskError('');
      setFetchConfigOpen(false);
      setFetchProgressOpen(true);
      message.success('抓取任务已启动，正在后台执行。');
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      const detail = error?.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : '创建抓取任务失败');
    } finally {
      setStartingFetchTask(false);
    }
  };

  const handleDelete = async (documentId: number) => {
    setDeletingId(documentId);
    try {
      await deleteDocument(documentId);
      message.success('文档删除成功');
      await fetchDocuments();
    } catch (error) {
      void error;
      message.error('文档删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const openDocumentDetail = (record: DocumentItem) => {
    setSelectedDocument(record);
    setDetailModalOpen(true);
  };

  const columns: ColumnsType<DocumentItem> = [
    {
      title: '文档',
      dataIndex: 'file_name',
      key: 'file_name',
      render: (_, record) => {
        const fileVisual = getFileTypeVisual(record.file_type);
        return (
          <Space align="start" size={12}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f3f7f3',
                color: '#14532d',
                flexShrink: 0,
              }}
            >
              {fileVisual.icon}
            </div>
            <Space direction="vertical" size={2}>
              <Typography.Text strong>{record.file_name}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.file_path}
              </Typography.Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: '类型',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 130,
      render: (value: string) => {
        const fileVisual = getFileTypeVisual(value);
        return (
          <Tag color={fileVisual.color} style={{ marginInlineEnd: 0 }}>
            <Space size={4}>
              {fileVisual.icon}
              {fileVisual.label}
            </Space>
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value: string) => {
        const statusVisual = getStatusVisual(value);
        return (
          <Tag color={statusVisual.color} style={{ marginInlineEnd: 0 }}>
            {statusVisual.label}
          </Tag>
        );
      },
    },
    {
      title: 'Chunk 数',
      dataIndex: 'chunk_count',
      key: 'chunk_count',
      width: 110,
      align: 'right',
      render: (value: number) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (value: string) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(value)}
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      render: (_, record) => (
        <Space size={8}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDocumentDetail(record)}>
            查看详情
          </Button>
          <Popconfirm
            title="确认删除该文档吗？"
            description="删除后将同步移除相关切片和索引记录。"
            okText="删除"
            cancelText="取消"
            onConfirm={() => void handleDelete(record.id)}
          >
            <Button danger size="small" icon={<DeleteOutlined />} loading={deletingId === record.id}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const isTaskRunning = taskStatus?.status === 'queued' || taskStatus?.status === 'running' || !taskStatus;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-heading">
        <Typography.Title level={2} className="page-title">
          文档管理
        </Typography.Title>
        <Typography.Text type="secondary" className="page-description">
          管理知识库文档、索引和资料接入任务，让文档接入、检索构建和状态查看更集中。
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
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <Input
              allowClear
              value={keyword}
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="搜索文件名、标题或路径"
              style={{ width: 360, maxWidth: '100%' }}
              onChange={(event) => setKeyword(event.target.value)}
            />

            <Space wrap>
              <Tag
                icon={<DatabaseOutlined />}
                color="default"
                style={{
                  paddingInline: 10,
                  paddingBlock: 4,
                  borderRadius: 999,
                  marginInlineEnd: 0,
                }}
              >
                共 {documents.length} 份文档，已索引 {indexedCount} 份
              </Tag>
              <Button icon={<CloudDownloadOutlined />} onClick={handleOpenFetchConfig}>
                抓取资料
              </Button>
              <Button icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>
                上传文档
              </Button>
              <Button type="primary" icon={<ReloadOutlined />} loading={reindexing} onClick={() => void handleReindex()}>
                重建索引
              </Button>
            </Space>
          </Space>

          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            支持 Markdown、TXT、JSON 等文档类型，上传后可直接参与知识库检索与问答。
          </Typography.Text>
        </Space>
      </Card>

      <Card
        bordered={false}
        title="文档列表"
        extra={<Typography.Text type="secondary">当前结果 {filteredDocuments.length} 条</Typography.Text>}
        style={{
          borderRadius: 20,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        }}
        bodyStyle={{ padding: 8 }}
      >
        <Table<DocumentItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredDocuments}
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
                    <Typography.Text strong>还没有可展示的文档</Typography.Text>
                    <Typography.Text type="secondary">
                      你可以先上传本地文档，或通过抓取资料功能补充知识库内容。
                    </Typography.Text>
                  </Space>
                }
              >
                <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>
                  立即上传文档
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        title="上传文档"
        open={uploadModalOpen}
        confirmLoading={uploading}
        onOk={() => void handleUpload()}
        onCancel={() => {
          setUploadModalOpen(false);
          setSelectedFile(null);
        }}
        okText="开始上传"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item label="选择文件">
            <div
              style={{
                border: '1px dashed #cbd5e1',
                borderRadius: 14,
                padding: 18,
                background: '#f8fbf8',
              }}
            >
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <input
                  type="file"
                  accept=".md,.markdown,.txt,.json"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
                {selectedFile ? (
                  <Typography.Text strong>已选择：{selectedFile.name}</Typography.Text>
                ) : (
                  <Typography.Text type="secondary">请选择要上传到知识库的文档文件。</Typography.Text>
                )}
              </Space>
            </div>
          </Form.Item>
          <Typography.Text type="secondary">
            支持 README、Markdown、TXT、JSON 等文档类型。
          </Typography.Text>
        </Form>
      </Modal>

      <Modal
        title="文档详情"
        open={detailModalOpen}
        footer={null}
        onCancel={() => setDetailModalOpen(false)}
        width={760}
      >
        {selectedDocument ? (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="文件名" span={2}>
              {selectedDocument.file_name}
            </Descriptions.Item>
            <Descriptions.Item label="标题" span={2}>
              {selectedDocument.title}
            </Descriptions.Item>
            <Descriptions.Item label="文件路径" span={2}>
              <Typography.Text copyable>{selectedDocument.file_path}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="文件类型">{selectedDocument.file_type}</Descriptions.Item>
            <Descriptions.Item label="来源类型">{selectedDocument.source_type}</Descriptions.Item>
            <Descriptions.Item label="文档状态">{getStatusVisual(selectedDocument.status).label}</Descriptions.Item>
            <Descriptions.Item label="Chunk 数">{selectedDocument.chunk_count}</Descriptions.Item>
            <Descriptions.Item label="文件大小">{selectedDocument.file_size} Bytes</Descriptions.Item>
            <Descriptions.Item label="最近索引时间">
              {formatDateTime(selectedDocument.indexed_at)}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{formatDateTime(selectedDocument.created_at)}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(selectedDocument.updated_at)}</Descriptions.Item>
            <Descriptions.Item label="最近错误" span={2}>
              {selectedDocument.last_error || '无'}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      <Modal
        title="抓取中国站点资料"
        open={fetchConfigOpen}
        confirmLoading={startingFetchTask}
        onOk={() => void handleStartFetchTask()}
        onCancel={() => setFetchConfigOpen(false)}
        okText="开始抓取并自动入库"
        cancelText="取消"
        width={760}
      >
        <Form<FetchConfigValues>
          layout="vertical"
          form={fetchForm}
          initialValues={{ site_keys: [], custom_urls_text: '' }}
        >
          <Form.Item
            label="预置中国站点"
            name="site_keys"
            rules={[
              {
                validator: async (_, value: string[] | undefined) => {
                  const customValue = fetchForm.getFieldValue('custom_urls_text');
                  const hasCustom = String(customValue ?? '')
                    .split('\n')
                    .some((item) => item.trim());
                  if ((value?.length ?? 0) === 0 && !hasCustom) {
                    throw new Error('请至少选择一个预置站点，或填写一个自定义中国站点 URL。');
                  }
                },
              },
            ]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {sourceOptions.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      padding: '12px 14px',
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      borderRadius: 14,
                      background: 'linear-gradient(180deg, #fbfdfb 0%, #f4f8f5 100%)',
                    }}
                  >
                    <Checkbox value={item.key}>
                      <Typography.Text strong>{item.title}</Typography.Text>
                    </Checkbox>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0 6px' }}>
                      <Tag>{item.source}</Tag>
                      <Typography.Text type="secondary">{item.url}</Typography.Text>
                    </div>
                    <Typography.Text type="secondary">{item.summary}</Typography.Text>
                  </div>
                ))}
                {loadingSourceOptions ? <Typography.Text type="secondary">正在加载站点列表...</Typography.Text> : null}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item
            label="自定义中国站点 URL"
            name="custom_urls_text"
            extra="每行一个 URL。仅支持中国站点域名，例如 .cn、cloud.tencent.com、help.aliyun.com、support.huaweicloud.com。"
          >
            <Input.TextArea
              rows={5}
              placeholder={`https://cloud.tencent.com/document/product/...\nhttps://help.aliyun.com/zh/...`}
            />
          </Form.Item>

          <Alert
            type="info"
            showIcon
            message="执行流程"
            description="系统会在后台生成本地演示资料、抓取你勾选的中国站点内容、写入 backend/data，并自动重建知识库索引。"
          />
        </Form>
      </Modal>

      <Modal
        title="抓取进度与结果明细"
        open={fetchProgressOpen}
        onCancel={() => {
          if (!isTaskRunning) {
            setFetchProgressOpen(false);
          }
        }}
        footer={
          isTaskRunning
            ? [
                <Button key="close" disabled>
                  任务执行中
                </Button>,
              ]
            : [
                <Button key="close" type="primary" onClick={() => setFetchProgressOpen(false)}>
                  关闭
                </Button>,
              ]
        }
        closable={!isTaskRunning}
        maskClosable={!isTaskRunning}
        width={900}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {taskError ? <Alert type="warning" showIcon message={taskError} /> : null}

          <Progress
            percent={taskStatus?.progress ?? 0}
            status={
              taskStatus?.status === 'failed'
                ? 'exception'
                : taskStatus?.status === 'completed'
                  ? 'success'
                  : 'active'
            }
          />

          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="任务状态">{taskStatus?.status ?? 'queued'}</Descriptions.Item>
            <Descriptions.Item label="当前步骤">{taskStatus?.current_step ?? '正在初始化任务'}</Descriptions.Item>
            <Descriptions.Item label="开始时间">{taskStatus?.started_at ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="结束时间">{taskStatus?.finished_at ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="本地资料">{taskStatus?.local_documents.length ?? 0} 份</Descriptions.Item>
            <Descriptions.Item label="站点资料">{taskStatus?.web_documents.length ?? 0} 份</Descriptions.Item>
            <Descriptions.Item label="扫描文件数">{taskStatus?.scanned_files ?? 0}</Descriptions.Item>
            <Descriptions.Item label="向量数量">{taskStatus?.vector_count ?? 0}</Descriptions.Item>
          </Descriptions>

          {taskStatus?.error_message ? <Alert type="error" showIcon message={taskStatus.error_message} /> : null}

          <Card size="small" title="抓取结果">
            <List
              locale={{ emptyText: '任务开始后，这里会显示每个站点的抓取结果。' }}
              dataSource={taskStatus?.source_results ?? []}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color={item.status === 'success' ? 'success' : 'error'}>
                        {item.status === 'success' ? '成功' : '失败'}
                      </Tag>
                      <Typography.Text strong>{item.title}</Typography.Text>
                    </Space>
                    <Typography.Text type="secondary">{item.url}</Typography.Text>
                    {item.file_path ? <Typography.Text>已保存：{item.file_path}</Typography.Text> : null}
                    {item.message ? <Typography.Text type="secondary">{item.message}</Typography.Text> : null}
                  </Space>
                </List.Item>
              )}
            />
          </Card>

          <Card size="small" title="任务日志">
            <List
              size="small"
              locale={{ emptyText: '暂无日志。' }}
              dataSource={taskStatus?.logs ?? []}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Card>

          {(taskStatus?.web_fetch_errors.length ?? 0) > 0 ? (
            <Card size="small" title="失败明细">
              <List
                size="small"
                dataSource={taskStatus?.web_fetch_errors ?? []}
                renderItem={(item) => (
                  <List.Item>
                    <Typography.Text type="danger">{item}</Typography.Text>
                  </List.Item>
                )}
              />
            </Card>
          ) : null}
        </Space>
      </Modal>
    </Space>
  );
}

export default DocumentsPage;
