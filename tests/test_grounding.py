from __future__ import annotations

from denken.catalog import load_catalog
from denken.generate import generate
from denken.models import ProblemType
from denken.validate import check_numeric_grounding

FIELDS, TEMPLATES = load_catalog()


def test_stub_output_is_fully_grounded():
    """stub 出力(=テンプレ整形)は全数値が solver 値・定数で説明できる。"""
    for t in TEMPLATES.values():
        if t.type != ProblemType.CALC:
            continue
        for seed in range(8):
            p = generate(t, seed)
            res = check_numeric_grounding(p, t)
            assert res.ok, f"{t.id}#{seed}: ungrounded={res.ungrounded}"


def test_detects_hallucinated_number():
    """solver 値で説明できない数値(LLM の捏造を模擬)を検出する。"""
    t = TEMPLATES["pm_vdrop_3ph"]
    p = generate(t, 1)
    p.explanation += " なお最終的な答えは 987654 V である。"
    res = check_numeric_grounding(p, t)
    assert not res.ok
    assert "987654" in res.ungrounded


def test_close_value_is_grounded():
    """表示丸めの範囲内(±2%)なら grounded 扱い。"""
    t = TEMPLATES["pm_vdrop_3ph"]
    p = generate(t, 1)
    true_v = p.answer.value
    p.explanation = f"答えはおよそ {true_v} V"
    assert check_numeric_grounding(p, t).ok
