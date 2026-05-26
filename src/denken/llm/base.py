"""LLM バックエンドの共通インターフェース。

生成エンジンを差し替え可能にする (アイデア#41)。LLM は「与えた数値の言い換え」
のみ担当し、計算はしない。数値の整合は後段 validate で必ず確認する。
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel


class ProseRequest(BaseModel):
    title: str
    ptype: str  # "calc" / "essay"
    params: dict[str, Any]
    values: dict[str, float]
    answer_display: str
    prompt_hint: str = ""
    draft_statement: str = ""
    draft_explanation: str = ""


class ProseResult(BaseModel):
    statement: str
    explanation: str


class LLMBackend(ABC):
    name: str = "base"

    @abstractmethod
    def write(self, req: ProseRequest) -> ProseResult: ...
