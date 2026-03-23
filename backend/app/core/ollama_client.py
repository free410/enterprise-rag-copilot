from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.schemas.chat import RetrievedChunk


@dataclass(slots=True)
class ModelGenerationResult:
    answer: str
    model_used: str


class OllamaClient:
    def __init__(self) -> None:
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.timeout = settings.ollama_timeout_seconds
        self.provider_model_map = {
            "qwen": settings.ollama_qwen_model,
            "deepseek": settings.ollama_deepseek_model,
            "llama": settings.ollama_llama_model,
        }

    def get_provider_status(self) -> dict[str, object]:
        available_providers = ["mock"]
        installed_models: list[str] = []
        model_status = "fallback"

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                body = response.json()
        except Exception:
            return {
                "available_providers": available_providers,
                "installed_models": installed_models,
                "model_status": model_status,
            }

        installed_models = [
            item.get("name", "")
            for item in body.get("models", [])
            if item.get("name")
        ]
        for provider, model_name in self.provider_model_map.items():
            if model_name in installed_models:
                available_providers.append(provider)

        model_status = "available" if len(available_providers) > 1 else "fallback"
        return {
            "available_providers": available_providers,
            "installed_models": installed_models,
            "model_status": model_status,
        }

    def generate(
        self,
        provider: str,
        system_prompt: str,
        user_prompt: str,
        retrieved_chunks: list[RetrievedChunk],
    ) -> ModelGenerationResult:
        normalized_provider = provider.lower()
        if normalized_provider == "mock":
            return self._mock_generate(user_prompt, retrieved_chunks)

        model_name = self.provider_model_map.get(normalized_provider)
        if not model_name:
            return self._mock_generate(user_prompt, retrieved_chunks)

        try:
            self._ensure_available()
            answer = self._generate_with_ollama(model_name, system_prompt, user_prompt)
            if not answer.strip():
                return self._mock_generate(user_prompt, retrieved_chunks)
            return ModelGenerationResult(answer=answer.strip(), model_used=model_name)
        except Exception:
            return self._mock_generate(user_prompt, retrieved_chunks)

    def _ensure_available(self) -> None:
        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()

    def _generate_with_ollama(self, model_name: str, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": model_name,
            "system": system_prompt,
            "prompt": user_prompt,
            "stream": False,
            "options": {
                "temperature": 0.2,
            },
        }
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(f"{self.base_url}/api/generate", json=payload)
            response.raise_for_status()
        body = response.json()
        return body.get("response", "")

    def _mock_generate(
        self,
        user_prompt: str,
        retrieved_chunks: list[RetrievedChunk],
    ) -> ModelGenerationResult:
        if not retrieved_chunks:
            answer = (
                "根据当前检索到的资料，无法确认这个问题的答案。"
                "请先上传相关文档或重新构建索引后再提问。"
            )
            return ModelGenerationResult(answer=answer, model_used="mock")

        source_names = ", ".join(dict.fromkeys(chunk.file_name for chunk in retrieved_chunks))
        evidence_lines = []
        for chunk in retrieved_chunks[:3]:
            snippet = chunk.content.strip().replace("\n", " ")
            evidence_lines.append(f"- {chunk.file_name}: {snippet[:180]}")

        answer = (
            "当前回答由 mock 模式生成，因为本地模型不可用或未选择可用 provider。\n"
            f"我基于检索到的资料做了保守总结，相关来源包括：{source_names}。\n"
            "从上下文看，最相关的信息如下：\n"
            f"{chr(10).join(evidence_lines)}\n"
            "如果你需要更自然的生成式回答，可以启动 Ollama 后用 qwen、deepseek 或 llama provider 再试一次。"
        )
        return ModelGenerationResult(answer=answer, model_used="mock")
