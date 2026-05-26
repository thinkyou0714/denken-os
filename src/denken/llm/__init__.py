"""LLM バックエンド群。"""

from __future__ import annotations

from denken.llm.base import LLMBackend, ProseRequest, ProseResult
from denken.llm.stub import StubBackend


def get_backend(name: str = "stub", **kwargs) -> LLMBackend:
    if name == "stub":
        return StubBackend()
    if name == "ollama":
        from denken.llm.ollama import OllamaBackend

        return OllamaBackend(**kwargs)
    raise ValueError(f"unknown backend: {name}")


__all__ = ["LLMBackend", "ProseRequest", "ProseResult", "StubBackend", "get_backend"]
