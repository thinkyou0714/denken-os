"""Ollama バックエンド。構造化出力(JSON Schema)で形崩れを防ぐ (アイデア#64)。

数値は solver が確定済みなので、LLM には「言い換え・整形のみ、数値の改変禁止」
を強く指示する (アイデア#67)。実呼び出しにはローカルで `ollama` が必要。
"""

from __future__ import annotations

from denken.llm.base import LLMBackend, ProseRequest, ProseResult

_SYSTEM = (
    "あなたは電験二種(第二種電気主任技術者)二次試験の問題作成者です。"
    "与えられたパラメータ・中間値・最終解答を使い、自然な日本語の問題文と解説を作成します。"
    "厳守事項: (1) 与えられた数値を一切変更・新規追加しない。"
    "(2) 計算は既に確定しているので再計算しない。"
    "(3) 解説は『与条件→等価回路→立式→代入→計算→検算→答』の流れで簡潔に。"
    "(4) 数式には単位を併記する。"
    "(5) 出力は指定の JSON スキーマに厳密に従う。"
)


class OllamaBackend(LLMBackend):
    def __init__(
        self,
        model: str = "qwen2.5:14b",
        host: str | None = None,
        temperature: float = 0.2,
    ) -> None:
        self.model = model
        self.host = host
        self.temperature = temperature
        self.name = f"ollama:{model}"

    def write(self, req: ProseRequest) -> ProseResult:
        import ollama  # 遅延 import: 未導入環境でもモジュール読み込みは通す

        client = ollama.Client(host=self.host) if self.host else ollama
        user = (
            f"タイトル: {req.title}\n"
            f"種別: {req.ptype}\n"
            f"パラメータ: {req.params}\n"
            f"中間値: {req.values}\n"
            f"最終解答: {req.answer_display}\n"
            f"補足指示: {req.prompt_hint}\n\n"
            f"下書き(問題文): {req.draft_statement}\n"
            f"下書き(解説): {req.draft_explanation}\n\n"
            "上記の数値を保ったまま、問題文と解説を整えてください。"
        )
        resp = client.chat(
            model=self.model,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": user},
            ],
            format=ProseResult.model_json_schema(),
            options={"temperature": self.temperature},
        )
        return ProseResult.model_validate_json(resp["message"]["content"])
