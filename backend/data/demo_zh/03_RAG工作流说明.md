# RAG 工作流说明

## 一、文档接入
系统会扫描 backend/data 目录，读取以下类型文件：
- README.md
- Markdown 文档
- txt 文本
- json 文档
- 接口说明文本
- 变更说明文本

## 二、文本预处理
Loader 会对文本进行以下清洗：
- 统一换行符
- 去掉过多空行
- 折叠多余空格
- 去掉 Markdown 链接中的 URL，仅保留链接文字
- 去掉 HTML 注释

## 三、切片
系统根据 chunk_size 和 chunk_overlap 对文本做滑动窗口切分。
每个 chunk 会保留：
- 文件名
- 文件路径
- 文件类型
- chunk_id
- chunk_index

## 四、向量化与索引
1. 对 chunk 做 embedding。
2. 将 embedding 向量写入 FAISS。
3. 将 chunk 元数据写入数据库。

## 五、问答
1. 用户输入 query。
2. 对 query 做 embedding。
3. 从 FAISS 中召回 top_k 个相关 chunk。
4. 把召回结果拼接成上下文。
5. 调用 Ollama 或 mock provider 生成回答。
6. 返回回答、召回片段、来源文件、实际使用的模型。

## 六、回退策略
如果 provider 选择 qwen、deepseek 或 llama，但本地 Ollama 不可用，则系统自动切换到 mock 模式，确保演示链路不中断。
