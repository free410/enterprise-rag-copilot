from __future__ import annotations

import json
import re
import threading
from dataclasses import asdict, dataclass
from datetime import datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

import httpx

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.index_service import index_service


LOCAL_DOCS_DIR = settings.data_dir / "demo_zh"
WEB_DOCS_DIR = settings.data_dir / "demo_zh_web"
MANIFEST_PATH = settings.data_dir / "demo_manifest.json"
ALLOWED_HOST_SUFFIXES = (
    ".cn",
    ".com.cn",
    ".gov.cn",
    ".edu.cn",
    ".org.cn",
    ".net.cn",
    "aliyun.com",
    "cloud.tencent.com",
    "tencent.com",
    "huaweicloud.com",
    "volcengine.com",
    "baidu.com",
    "jdcloud.com",
)


LOCAL_DOCUMENTS: dict[str, str] = {
    "01_项目概览.md": """# 企业内部知识与文档 RAG Copilot 项目概览

## 项目定位
这是一个面向企业内部研发协作场景的知识与文档 RAG Copilot 系统，目标是把企业内部的代码说明、接口文档、变更记录、运维手册等资料统一沉淀到本地知识库，并通过检索增强问答能力提升资料查找效率。

## 当前能力
- 文档扫描：支持读取 backend/data 目录中的 Markdown、txt、json 文档。
- 文档上传：支持通过后台页面上传文档并自动进入知识库。
- 文本清洗：对读取到的文档做空行、空白字符、Markdown 链接等内容清洗。
- Chunk 切分：按设定的 chunk_size 和 chunk_overlap 做切片。
- 向量索引：使用本地 Embedding 和 FAISS 构建索引。
- 问答接口：支持基于检索结果进行 RAG 问答。
- 模型调用：支持 qwen、deepseek、llama、mock 四种 provider。
- 回退机制：当 Ollama 不可用时，自动回退到 mock 模式。

## 典型使用场景
1. 研发同学提问“某个模块负责什么”。
2. 新同事提问“如何启动项目”。
3. 产品或测试提问“最近一次变更有哪些”。
4. 运维同学查询“索引目录、数据目录在哪里”。

## 默认登录信息
- 用户名：admin
- 密码：change-this-password

## 推荐演示顺序
1. 启动后端和前端。
2. 登录后台。
3. 进入文档管理页查看预置资料。
4. 点击重新构建索引。
5. 进入智能问答页，选择 mock 或本地模型发起提问。
6. 在历史记录页查看本次问答结果。
""",
    "02_后端接口说明.md": """# 后端接口说明

## 认证接口
### POST /api/auth/login
- 用途：管理员登录。
- 请求体：
```json
{
  "username": "admin",
  "password": "change-this-password"
}
```
- 返回：JWT token 与当前用户信息。

### GET /api/auth/me
- 用途：获取当前登录用户信息。
- 请求头：Authorization: Bearer <token>

## 健康检查
### GET /api/health
- 用途：检查服务是否可用。

## 控制台摘要
### GET /api/dashboard/summary
- 用途：获取文档总数、索引状态、模型状态、最近问答次数等摘要数据。

## 文档管理
### GET /api/documents
- 用途：查询文档列表。

### POST /api/documents/upload
- 用途：上传 Markdown、txt、json 文档。

### POST /api/documents/reindex
- 用途：重新扫描 data 目录并重建索引。

### DELETE /api/documents/{id}
- 用途：删除指定文档及其 chunk。

### GET /api/index/status
- 用途：查看当前索引状态、向量数量、索引文件是否存在。

## 问答接口
### POST /api/chat
- 用途：发起 RAG 问答。
- 请求体：
```json
{
  "query": "请说明系统设置页的作用",
  "provider": "mock",
  "top_k": 4
}
```

## 系统设置
### GET /api/settings
- 用途：查看默认 provider、默认 top_k、数据目录、索引目录。

### POST /api/settings
- 用途：保存系统设置。
""",
    "03_RAG工作流说明.md": """# RAG 工作流说明

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
""",
    "04_模块职责说明.md": """# 模块职责说明

## 后端模块
### app/api
- 提供登录、健康检查、文档管理、问答、历史记录、系统设置等接口。

### app/core
- 配置加载、数据库连接、安全认证、Embedding、向量库、Ollama 客户端等基础设施。

### app/models
- 用户、文档、chunk、历史记录、系统设置等数据模型。

### app/rag
- Loader、Splitter、Retriever、Prompt 组装等 RAG 核心逻辑。

### app/services
- 索引服务、RAG 服务、设置服务等编排层。

## 前端模块
### 登录页
- 输入管理员账号密码。
- 登录成功后写入 token 并跳转控制台。

### 控制台首页
- 展示文档数、索引状态、最近问答次数、模型状态。

### 文档管理
- 查看文档、上传文档、重建索引、删除文档。

### 智能问答
- 输入问题、选择 provider、展示回答和召回片段。

### 历史记录
- 展示问题、回答摘要、模型和时间。

### 系统设置
- 设置默认 provider、默认 top_k、数据目录和索引目录。
""",
    "05_变更说明.txt": """版本：v0.1.0
日期：2026-03-23

本次版本完成的主要内容：
1. 完成 FastAPI 后端基础设施搭建，包括配置加载、数据库连接、JWT 登录认证和健康检查。
2. 完成文档数据层，支持扫描本地 data 目录、切片、Embedding 和 FAISS 建索引。
3. 完成本地模型接入，支持 qwen、deepseek、llama、mock 四种 provider。
4. 完成 React + Ant Design 后台前端，覆盖登录、控制台、文档管理、智能问答、历史记录和系统设置。
5. 增加系统设置与控制台摘要接口。
6. 补充 Dockerfile、docker-compose 和项目说明文档。

演示建议：
- 如果机器没有本地模型，请直接选择 mock。
- 如需演示真实模型，请提前准备 Ollama 并拉取模型。
""",
    "06_运维检查表.json": """{
  "system_name": "企业内部知识与文档 RAG Copilot",
  "checklist": [
    {
      "category": "服务启动",
      "items": [
        "后端 uvicorn 服务已启动",
        "前端 Vite 服务已启动",
        "浏览器可访问 http://127.0.0.1:5173"
      ]
    },
    {
      "category": "认证",
      "items": [
        "默认管理员账号可登录",
        "JWT token 正常返回",
        "GET /api/auth/me 返回当前用户"
      ]
    },
    {
      "category": "文档与索引",
      "items": [
        "backend/data 中存在可用文档",
        "POST /api/documents/reindex 执行成功",
        "GET /api/index/status 返回 vector_count 大于 0"
      ]
    },
    {
      "category": "问答链路",
      "items": [
        "POST /api/chat 返回 answer",
        "retrieved_chunks 中包含召回结果",
        "source_files 中包含来源文件"
      ]
    }
  ],
  "recommended_provider": "mock",
  "notes": [
    "演示优先使用 mock，确保链路稳定。",
    "若需要真实模型，可切换到 qwen、deepseek 或 llama。"
  ]
}""",
    "07_演示问题清单.md": """# 演示问题清单

以下问题可直接用于完整演示：

1. 这个项目的核心目标是什么？
2. 文档管理页支持哪些操作？
3. RAG 工作流是怎样的？
4. 当本地模型不可用时系统会怎么处理？
5. 系统设置页可以配置哪些内容？
6. 后端有哪些核心 API？
7. 智能问答接口会返回哪些字段？
8. 如何重新构建索引？
9. 控制台首页展示哪些指标？
10. 当前版本完成了哪些功能？
""",
}


@dataclass(slots=True)
class DemoSourceOption:
    key: str
    title: str
    url: str
    source: str
    summary: str
    default_selected: bool = True


@dataclass(slots=True)
class SourceFetchResult:
    key: str
    title: str
    url: str
    source: str
    status: str
    file_path: str | None = None
    message: str | None = None


DEFAULT_SOURCE_OPTIONS = [
    DemoSourceOption(
        key="aliyun_apig",
        title="阿里云 API 网关自建认证鉴权",
        url="https://help.aliyun.com/zh/api-gateway/configure-self-built-authentication",
        source="阿里云帮助中心",
        summary="适合补充 API 网关、认证鉴权、网关配置类知识。",
    ),
    DemoSourceOption(
        key="tencentcloud_api",
        title="腾讯云 文本内容安全 API 接入指引",
        url="https://cloud.tencent.com/document/product/1124/100982",
        source="腾讯云文档",
        summary="适合补充 API 接入、签名、参数说明类知识。",
    ),
    DemoSourceOption(
        key="huaweicloud_jwt",
        title="华为云 API 网关 JWT 认证配置",
        url="https://support.huaweicloud.com/usermanual-apig/apig_03_0135.html",
        source="华为云文档",
        summary="适合补充 JWT 认证、网关安全策略类知识。",
    ),
]


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.skip_depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "noscript", "svg"}:
            self.skip_depth += 1
        elif tag in {"p", "div", "section", "article", "li", "h1", "h2", "h3", "h4", "pre", "code", "br"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript", "svg"} and self.skip_depth > 0:
            self.skip_depth -= 1
        elif tag in {"p", "div", "section", "article", "li", "h1", "h2", "h3", "h4", "pre", "code"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self.skip_depth > 0:
            return
        text = unescape(data)
        if text.strip():
            self.parts.append(text)

    def get_text(self) -> str:
        joined = "".join(self.parts)
        joined = re.sub(r"\r\n?", "\n", joined)
        joined = re.sub(r"[ \t]+", " ", joined)
        joined = re.sub(r"\n{3,}", "\n\n", joined)
        lines = [line.strip() for line in joined.splitlines()]
        filtered = [line for line in lines if len(line) > 1]
        return "\n".join(filtered).strip()


class DemoDataService:
    def __init__(self) -> None:
        self._source_options = {item.key: item for item in DEFAULT_SOURCE_OPTIONS}
        self._tasks: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def get_source_options(self) -> list[dict[str, Any]]:
        return [asdict(item) for item in self._source_options.values()]

    def start_fetch_task(self, site_keys: list[str], custom_urls: list[str]) -> str:
        normalized_keys = list(dict.fromkeys(site_keys))
        normalized_urls = self._normalize_custom_urls(custom_urls)

        selected_sources = [self._source_options[key] for key in normalized_keys if key in self._source_options]
        if not selected_sources and not normalized_urls:
            raise ValueError("请至少选择一个预置中国站点，或填写一个自定义中国站点 URL。")

        with self._lock:
            running_task = self._find_running_task_locked()
            if running_task:
                raise ValueError(f"当前已有抓取任务正在执行：{running_task}")

            task_id = uuid4().hex
            self._tasks[task_id] = {
                "task_id": task_id,
                "status": "queued",
                "progress": 0,
                "current_step": "任务已创建，等待开始",
                "started_at": datetime.now().isoformat(),
                "finished_at": None,
                "selected_sources": [asdict(item) for item in selected_sources],
                "custom_urls": normalized_urls,
                "source_results": [],
                "local_documents": [],
                "web_documents": [],
                "web_fetch_errors": [],
                "manifest_file": None,
                "scanned_files": 0,
                "indexed_documents": 0,
                "total_chunks": 0,
                "vector_count": 0,
                "error_message": None,
                "logs": [],
            }

        worker = threading.Thread(
            target=self._run_fetch_task,
            args=(task_id, selected_sources, normalized_urls),
            daemon=True,
        )
        worker.start()
        return task_id

    def get_task(self, task_id: str) -> dict[str, Any] | None:
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                return None
            return json.loads(json.dumps(task, ensure_ascii=False))

    def prepare_cn_demo_data(self, *, include_web: bool = True) -> dict[str, object]:
        local_files = self._write_local_documents()
        web_files: list[Path] = []
        errors: list[str] = []
        source_results: list[SourceFetchResult] = []

        if include_web:
            web_files, source_results, errors = self._fetch_sources(list(self._source_options.values()), [])

        manifest_path = self._write_manifest(local_files, web_files, errors)
        return {
            "local_documents": [path.relative_to(settings.data_dir).as_posix() for path in local_files],
            "web_documents": [path.relative_to(settings.data_dir).as_posix() for path in web_files],
            "web_fetch_errors": errors,
            "manifest_file": manifest_path.relative_to(settings.data_dir).as_posix(),
            "source_results": [asdict(item) for item in source_results],
        }

    def _run_fetch_task(
        self,
        task_id: str,
        selected_sources: list[DemoSourceOption],
        custom_urls: list[str],
    ) -> None:
        try:
            self._update_task(task_id, status="running", progress=5, current_step="正在准备本地演示资料")
            local_files = self._write_local_documents()
            self._update_task(
                task_id,
                progress=20,
                current_step="本地演示资料已生成",
                local_documents=[path.relative_to(settings.data_dir).as_posix() for path in local_files],
            )

            sources_total = len(selected_sources) + len(custom_urls)
            if sources_total == 0:
                self._append_log(task_id, "未选择中国站点抓取，跳过联网抓取步骤。")
                web_files: list[Path] = []
                source_results: list[SourceFetchResult] = []
                fetch_errors: list[str] = []
            else:
                custom_sources = [self._build_custom_source(url, index) for index, url in enumerate(custom_urls, start=1)]
                web_files, source_results, fetch_errors = self._fetch_sources(
                    selected_sources,
                    custom_sources,
                    task_id=task_id,
                )

            manifest_path = self._write_manifest(local_files, web_files, fetch_errors)
            self._update_task(
                task_id,
                progress=88,
                current_step="资料抓取完成，正在重建索引",
                web_documents=[path.relative_to(settings.data_dir).as_posix() for path in web_files],
                web_fetch_errors=fetch_errors,
                manifest_file=manifest_path.relative_to(settings.data_dir).as_posix(),
                source_results=[asdict(item) for item in source_results],
            )

            with SessionLocal() as db:
                reindex_result = index_service.reindex_all(db)

            self._update_task(
                task_id,
                status="completed",
                progress=100,
                current_step="抓取、入库和索引构建已完成",
                finished_at=datetime.now().isoformat(),
                scanned_files=reindex_result["scanned_files"],
                indexed_documents=reindex_result["indexed_documents"],
                total_chunks=reindex_result["total_chunks"],
                vector_count=reindex_result["vector_count"],
            )
        except Exception as exc:  # noqa: BLE001
            self._update_task(
                task_id,
                status="failed",
                progress=100,
                current_step="任务执行失败",
                finished_at=datetime.now().isoformat(),
                error_message=str(exc),
            )
            self._append_log(task_id, f"任务失败：{exc}")

    def _fetch_sources(
        self,
        selected_sources: list[DemoSourceOption],
        custom_sources: list[DemoSourceOption],
        *,
        task_id: str | None = None,
    ) -> tuple[list[Path], list[SourceFetchResult], list[str]]:
        WEB_DOCS_DIR.mkdir(parents=True, exist_ok=True)
        sources = [*selected_sources, *custom_sources]
        written: list[Path] = []
        results: list[SourceFetchResult] = []
        errors: list[str] = []
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
            )
        }

        with httpx.Client(headers=headers, timeout=20.0, follow_redirects=True) as client:
            for index, source in enumerate(sources, start=1):
                if task_id:
                    progress = 20 + int((index - 1) / max(len(sources), 1) * 60)
                    self._update_task(
                        task_id,
                        progress=progress,
                        current_step=f"正在抓取：{source.source} - {source.title}",
                    )
                    self._append_log(task_id, f"开始抓取：{source.url}")

                try:
                    response = client.get(source.url)
                    response.raise_for_status()
                    extractor = TextExtractor()
                    extractor.feed(response.text)
                    extracted = extractor.get_text()
                    if not extracted:
                        raise ValueError("未提取到正文内容")

                    file_name = self._resolve_source_slug(source)
                    target = WEB_DOCS_DIR / file_name
                    content = (
                        f"# {source.title}\n\n"
                        f"- 来源站点：{source.source}\n"
                        f"- 原始链接：{source.url}\n"
                        f"- 抓取时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
                        f"- 用途：{source.summary}\n\n"
                        "## 正文摘录（清洗后）\n\n"
                        f"{extracted[:12000].strip()}\n"
                    )
                    target.write_text(content, encoding="utf-8")
                    written.append(target)
                    result = SourceFetchResult(
                        key=source.key,
                        title=source.title,
                        url=source.url,
                        source=source.source,
                        status="success",
                        file_path=target.relative_to(settings.data_dir).as_posix(),
                        message="抓取成功并已保存到本地知识库目录。",
                    )
                    results.append(result)
                    if task_id:
                        self._append_log(task_id, f"抓取成功：{source.url}")
                except Exception as exc:  # noqa: BLE001
                    error_text = f"{source.source} - {source.url} - {exc}"
                    errors.append(error_text)
                    results.append(
                        SourceFetchResult(
                            key=source.key,
                            title=source.title,
                            url=source.url,
                            source=source.source,
                            status="failed",
                            message=str(exc),
                        )
                    )
                    if task_id:
                        self._append_log(task_id, f"抓取失败：{error_text}")

        return written, results, errors

    def _write_local_documents(self) -> list[Path]:
        LOCAL_DOCS_DIR.mkdir(parents=True, exist_ok=True)
        written: list[Path] = []

        for file_name, content in LOCAL_DOCUMENTS.items():
            target = LOCAL_DOCS_DIR / file_name
            target.write_text(content.strip() + "\n", encoding="utf-8")
            written.append(target)

        return written

    def _write_manifest(self, local_files: list[Path], web_files: list[Path], errors: list[str]) -> Path:
        manifest = {
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "local_documents": [path.relative_to(settings.data_dir).as_posix() for path in local_files],
            "web_documents": [path.relative_to(settings.data_dir).as_posix() for path in web_files],
            "web_fetch_errors": errors,
            "recommended_queries": [
                "这个项目的核心目标是什么？",
                "文档管理页支持哪些操作？",
                "RAG 工作流是怎样的？",
                "当本地模型不可用时系统会怎么处理？",
                "系统设置页可以配置哪些内容？",
            ],
        }
        MANIFEST_PATH.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        return MANIFEST_PATH

    def _normalize_custom_urls(self, custom_urls: list[str]) -> list[str]:
        normalized: list[str] = []
        for raw_url in custom_urls:
            value = raw_url.strip()
            if not value:
                continue
            parsed = urlparse(value)
            hostname = (parsed.hostname or "").lower()
            if parsed.scheme not in {"http", "https"} or not hostname:
                raise ValueError(f"无效 URL：{value}")
            if not self._is_china_site(hostname):
                raise ValueError(f"仅支持中国站点 URL：{value}")
            normalized.append(value)
        return list(dict.fromkeys(normalized))

    def _is_china_site(self, hostname: str) -> bool:
        return any(hostname.endswith(suffix) for suffix in ALLOWED_HOST_SUFFIXES)

    def _build_custom_source(self, url: str, index: int) -> DemoSourceOption:
        parsed = urlparse(url)
        host = parsed.hostname or "custom-site"
        path = parsed.path.strip("/") or "index"
        tail = path.split("/")[-1][:24]
        title = f"自定义站点资料 {index}"
        summary = f"用户自定义输入的中国站点资料，主机名为 {host}。"
        return DemoSourceOption(
            key=f"custom_{index}",
            title=title,
            url=url,
            source=host,
            summary=summary,
            default_selected=True,
        )

    def _resolve_source_slug(self, source: DemoSourceOption) -> str:
        parsed = urlparse(source.url)
        host = re.sub(r"[^a-zA-Z0-9]+", "_", parsed.netloc).strip("_").lower() or "source"
        tail = re.sub(r"[^a-zA-Z0-9]+", "_", parsed.path.strip("/")).strip("_").lower() or "index"
        return f"{host}_{tail[:48]}.md"

    def _find_running_task_locked(self) -> str | None:
        for task_id, task in self._tasks.items():
            if task["status"] in {"queued", "running"}:
                return task_id
        return None

    def _update_task(self, task_id: str, **updates: Any) -> None:
        with self._lock:
            task = self._tasks[task_id]
            task.update(updates)

    def _append_log(self, task_id: str, message: str) -> None:
        with self._lock:
            task = self._tasks[task_id]
            task["logs"].append(f"{datetime.now().strftime('%H:%M:%S')} {message}")


demo_data_service = DemoDataService()
