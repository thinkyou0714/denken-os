from __future__ import annotations

import pytest
from pydantic import ValidationError

from denken.catalog import load_catalog
from denken.generate import generate, generate_validated
from denken.models import AnswerSpec, ParamSpec, ProblemType, Template

FIELDS, TEMPLATES = load_catalog()


def test_effective_params_selects_variant():
    t = TEMPLATES["pm_vdrop_3ph"]
    base = {p.name: p for p in t.effective_params()}
    basic = {p.name: p for p in t.effective_params("basic")}
    assert set(base) == set(basic)
    # basic は Vr が 6600 固定
    assert basic["Vr"].choices == [6600]
    # 未定義難易度や None は base にフォールバック
    assert t.effective_params("applied") == t.params
    assert t.effective_params(None) == t.params


def test_generate_basic_variant_ranges_and_label():
    t = TEMPLATES["pm_vdrop_3ph"]
    for seed in range(5):
        p = generate(t, seed, difficulty="basic")
        assert p.difficulty == "basic"
        assert p.params["Vr"] == 6600
        assert p.params["R"] == 2.0 and p.params["X"] == 4.0
        assert p.id == f"pm_vdrop_3ph#basic#{seed}"


def test_generate_exam_variant_ranges():
    t = TEMPLATES["pm_vdrop_3ph"]
    for seed in range(5):
        p = generate(t, seed, difficulty="exam")
        assert p.difficulty == "exam"
        assert p.params["Vr"] in (66000, 154000)
        assert 8.0 <= p.params["X"] <= 15.0


def test_default_id_unchanged_without_difficulty():
    t = TEMPLATES["pm_vdrop_3ph"]
    assert generate(t, 3).id == "pm_vdrop_3ph#3"


@pytest.mark.parametrize("difficulty", ["basic", "applied", "exam"])
def test_variants_validate_and_pitfalls_hold(difficulty):
    """各難易度で生成が検証を通り、よくある誤りが正答と一致しない。"""
    t = TEMPLATES["pm_vdrop_3ph"]
    for seed in range(5):
        problem, ok = generate_validated(t, seed, difficulty=difficulty)
        assert ok, f"{difficulty}#{seed} 検証不合格"
        assert all(pf.display != problem.answer.display for pf in problem.pitfalls)


def test_template_difficulties_lists_base_and_variants():
    from denken.generate import template_difficulties

    t = TEMPLATES["pm_vdrop_3ph"]
    assert template_difficulties(t) == [None, "basic", "exam"]
    # variant の無いテンプレは base のみ
    assert template_difficulties(TEMPLATES["pm_loss_reduction"]) == [None]


def test_build_set_with_difficulty_applies_variant():
    from denken.problemset import build_set

    t = TEMPLATES["th_rlc_series"]
    problems = build_set([t], 3, difficulty="exam")
    assert problems
    for p in problems:
        assert p.difficulty == "exam"
        # exam では R は {3,5}
        assert p.params["R"] in (3, 5)


@pytest.mark.parametrize("tid", ["th_rlc_series", "th_series_resonance", "th_rc_transient"])
def test_theory_exam_variants_validate(tid):
    t = TEMPLATES[tid]
    for seed in range(6):
        _p, ok = generate_validated(t, seed, difficulty="exam")
        assert ok, f"{tid}[exam]#{seed} 検証不合格"


def test_template_rejects_variant_with_mismatched_param_names():
    with pytest.raises(ValidationError):
        Template(
            id="bad_variant",
            field_id="pm-transmission-vdrop",
            type=ProblemType.CALC,
            title="x",
            params=[ParamSpec(name="a", kind="choice", choices=[1.0])],
            variants={"basic": [ParamSpec(name="b", kind="choice", choices=[1.0])]},
            expressions={"a2": "a*2"},
            answer=AnswerSpec(expr="a2"),
        )
