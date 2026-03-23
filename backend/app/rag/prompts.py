from app.schemas.chat import RetrievedChunk


def detect_query_mode(query: str) -> str:
    lowered = query.lower()

    if any(keyword in lowered for keyword in ["函数", "function", "参数", "返回值"]):
        return "function_explanation"
    if any(keyword in lowered for keyword in ["模块", "职责", "module", "responsibility"]):
        return "module_responsibility"
    if any(keyword in lowered for keyword in ["变更", "更新", "release", "change", "summary", "摘要"]):
        return "change_summary"
    return "document_qa"


def build_system_prompt() -> str:
    return (
        "你是企业内部知识与文档 RAG Copilot。\n"
        "你只能基于检索到的上下文回答问题，禁止编造未出现在上下文中的事实。\n"
        "如果上下文不足以支持结论，必须明确回答“根据当前检索到的资料，无法确认”。\n"
        "回答时优先引用上下文中的文件、模块、函数、接口、变更信息。\n"
        "输出要求：\n"
        "1. 先给直接结论。\n"
        "2. 如果适合，再用 2-5 条简洁要点补充。\n"
        "3. 不要声称你访问了上下文之外的仓库或系统。\n"
        "4. 对函数解释、模块职责、变更摘要等问题，同样只能基于上下文。\n"
    )


def build_user_prompt(query: str, retrieved_chunks: list[RetrievedChunk]) -> str:
    mode = detect_query_mode(query)
    context = format_retrieved_context(retrieved_chunks)

    return (
        f"任务类型: {mode}\n"
        f"用户问题: {query}\n\n"
        "以下是检索到的上下文，请只基于这些内容回答：\n"
        f"{context}\n\n"
        "请给出最终回答。如果上下文证据不足，请直接说明不足，不要补充推测。"
    )


def format_retrieved_context(retrieved_chunks: list[RetrievedChunk]) -> str:
    if not retrieved_chunks:
        return "无可用上下文。"

    lines: list[str] = []
    for item in retrieved_chunks:
        lines.append(
            "\n".join(
                [
                    f"[Chunk] {item.chunk_id}",
                    f"[Source] {item.file_path}",
                    f"[Type] {item.file_type}",
                    f"[Score] {item.score:.4f}",
                    "[Content]",
                    item.content,
                ]
            )
        )
    return "\n\n---\n\n".join(lines)
