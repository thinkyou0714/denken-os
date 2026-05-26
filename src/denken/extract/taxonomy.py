"""PDF → 分野タクソノミー抽出。

【著作権の不変条件】このモジュールは見出し/章ラベルなどの *構造* のみを抽出し、
本文(問題文・解説)は一切返さない・保存しない。生成は原理ベースで行うため、
ここで参考書の中身を取り込むことは設計上禁止する (アイデア#94, #95)。
"""

from __future__ import annotations

import re
from pathlib import Path

# 章・節の見出しらしき行だけを拾うパターン (本文は対象外)
_HEADING = re.compile(
    r"^\s*(第?\s*[0-9０-９一二三四五六七八九十]+\s*[章節編]|[0-9]+(\.[0-9]+)*\s+\S)"
)


def extract_headings(pdf_path: Path, max_len: int = 40) -> list[str]:
    """PDF から見出し候補(構造ラベル)のみを抽出する。本文は返さない。

    pdfplumber が必要 (任意依存)。短い見出し行のみを対象にし、長文(=本文)は除外する。
    """
    try:
        import pdfplumber
    except ImportError as e:  # pragma: no cover - 任意依存
        raise RuntimeError("pdfplumber 未導入: pip install pdfplumber") from e

    headings: list[str] = []
    seen: set[str] = set()
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            for line in (page.extract_text() or "").splitlines():
                line = line.strip()
                if 0 < len(line) <= max_len and _HEADING.match(line) and line not in seen:
                    seen.add(line)
                    headings.append(line)
    return headings
