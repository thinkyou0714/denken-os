"""ゴールデン(スナップショット)回帰テスト (アイデア#81)。

決定論的なフィールドのみを保存・比較する(timestamp/IDなど揮発要素は除外)。
意図的に出力を変えたときは `DENKEN_UPDATE_GOLDEN=1 pytest` で golden を更新する。
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from denken.catalog import load_catalog
from denken.generate import generate

FIELDS, TEMPLATES = load_catalog()
GOLDEN_DIR = Path(__file__).parent / "golden"

CASES = [
    ("pm_vdrop_3ph", 1),
    ("mc_sync_vreg", 1),
    ("pe_full_wave_rect", 1),
    ("ct_rc_lowpass", 1),
    ("pm_loss_reduction", 1),
    ("mc_transformer_eff", 1),
    ("pm_power_flow", 1),
]


def _snapshot(p) -> dict:
    return {
        "type": p.type.value,
        "difficulty": p.difficulty,
        "params": p.params,
        "answer_value": p.answer.value if p.answer else None,
        "answer_display": p.answer.display if p.answer else None,
        "statement": p.statement,
        "solution_steps": p.solution_steps,
        "explanation": p.explanation,
    }


@pytest.mark.parametrize("template_id,seed", CASES)
def test_golden(template_id, seed):
    t = TEMPLATES[template_id]
    snap = _snapshot(generate(t, seed))  # 図なし=決定論的
    path = GOLDEN_DIR / f"{template_id}_{seed}.json"

    if os.environ.get("DENKEN_UPDATE_GOLDEN") or not path.exists():
        GOLDEN_DIR.mkdir(exist_ok=True)
        path.write_text(json.dumps(snap, ensure_ascii=False, indent=2), encoding="utf-8")
        pytest.skip(f"golden 更新: {path.name}")

    expected = json.loads(path.read_text(encoding="utf-8"))
    assert snap == expected, f"{template_id}#{seed} がゴールデンと不一致(意図的なら UPDATE_GOLDEN)"
