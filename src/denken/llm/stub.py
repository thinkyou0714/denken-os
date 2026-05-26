"""オフライン用 stub バックエンド。テンプレートの下書きをそのまま返す。

これにより Ollama 無しでも (テンプレ由来の) 正しい類題を量産・テストできる。
"""

from __future__ import annotations

from denken.llm.base import LLMBackend, ProseRequest, ProseResult


class StubBackend(LLMBackend):
    name = "stub"

    def write(self, req: ProseRequest) -> ProseResult:
        return ProseResult(statement=req.draft_statement, explanation=req.draft_explanation)
