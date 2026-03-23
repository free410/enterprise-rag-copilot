import json
import re
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings


SUPPORTED_EXTENSIONS = {".md", ".markdown", ".txt", ".json"}


@dataclass(slots=True)
class LoadedDocument:
    title: str
    text: str
    file_name: str
    file_path: str
    file_type: str
    metadata: dict[str, str]


def scan_data_directory(root_dir: Path | None = None) -> list[LoadedDocument]:
    root = (root_dir or settings.data_dir).resolve()
    excluded_dirs = {settings.vector_store_dir.resolve()}
    documents: list[LoadedDocument] = []

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(excluded in path.parents for excluded in excluded_dirs):
            continue
        if path.resolve() == (settings.data_dir / "rag_copilot.db").resolve():
            continue
        if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        loaded = load_document(path, root)
        if loaded:
            documents.append(loaded)

    documents.sort(key=lambda item: item.file_path)
    return documents


def load_document(file_path: Path, root_dir: Path | None = None) -> LoadedDocument | None:
    root = (root_dir or settings.data_dir).resolve()
    path = file_path.resolve()
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        return None

    raw_text = _read_text(path)
    if path.suffix.lower() == ".json":
        raw_text = _json_to_text(raw_text)

    cleaned_text = clean_text(raw_text)
    if not cleaned_text:
        return None

    relative_path = (
        path.relative_to(root).as_posix() if path.is_relative_to(root) else path.as_posix()
    )
    file_type = path.suffix.lower().lstrip(".")

    return LoadedDocument(
        title=path.stem,
        text=cleaned_text,
        file_name=path.name,
        file_path=relative_path,
        file_type=file_type,
        metadata={
            "file_name": path.name,
            "file_path": relative_path,
            "file_type": file_type,
        },
    )


def clean_text(text: str) -> str:
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = re.sub(r"\t+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"[ ]{2,}", " ", cleaned)
    cleaned = re.sub(r"\[\s*([^\]]+?)\s*\]\([^)]+\)", r"\1", cleaned)
    cleaned = re.sub(r"<!--.*?-->", "", cleaned, flags=re.DOTALL)
    return cleaned.strip()


def _read_text(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "gb18030"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_text(encoding="utf-8", errors="ignore")


def _json_to_text(raw_text: str) -> str:
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return raw_text
    return json.dumps(parsed, ensure_ascii=False, indent=2)
