from __future__ import annotations

import importlib.util

import pytest

from denken.catalog import load_catalog
from denken.generate import generate, generate_validated
from denken.models import AnswerSpec, ProblemType, Template
from denken.validate import validate_calc

FIELDS, TEMPLATES = load_catalog()


def test_params_not_floatified_in_statement():
    """choice の整数パラメータが '66000.0' のように float 表示されない(根本原因修正)。"""
    t = TEMPLATES["pm_vdrop_3ph"]
    p = generate(t, 5)
    assert ".0 V" not in p.statement  # Vr=66000 等が float 化していないこと
    assert "電力" in p.statement


def test_sanity_range_flags_unrealistic():
    """sane_max を外れた答えは検証で in_range=False になる。"""
    t = TEMPLATES["mc_sync_vreg"]
    p = generate(t, 0)
    # 正常範囲では合格
    assert validate_calc(p, t).in_range
    # 上限を意図的に小さくすると不合格になる
    tight = t.model_copy(deep=True)
    assert tight.answer is not None
    tight.answer.sane_max = 0.0
    res = validate_calc(p, tight)
    assert not res.in_range
    assert not res.ok


def test_generate_validated_returns_ok():
    t = TEMPLATES["pm_vdrop_3ph"]
    problem, ok = generate_validated(t, 11, attempts=3)
    assert ok
    assert problem.answer is not None


def test_all_calc_templates_in_range():
    for t in TEMPLATES.values():
        if t.type != ProblemType.CALC:
            continue
        for seed in range(10):
            p = generate(t, seed)
            assert validate_calc(p, t).in_range, f"{t.id}#{seed} out of sane range"


def test_template_rejects_bad_answer_expr():
    with pytest.raises(ValueError):
        Template(
            id="bad",
            field_id="pm-transmission-vdrop",
            type=ProblemType.CALC,
            title="x",
            expressions={"a": "1+1"},
            answer=AnswerSpec(expr="missing"),
        )


_HAS_FSRS = importlib.util.find_spec("fsrs") is not None


@pytest.mark.skipif(not _HAS_FSRS, reason="fsrs 未導入")
def test_scheduler_advances_due():
    from denken.schedule import Reviewer

    r = Reviewer()
    card = r.new_card()
    updated, due = r.review(card, "good")
    assert updated != card
    assert due is not None
