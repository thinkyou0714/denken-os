from __future__ import annotations

import math

import pytest

from denken.catalog import load_catalog
from denken.generate import generate
from denken.models import ProblemType
from denken.params import sample_params
from denken.solver import round_sig
from denken.validate import validate_calc, validate_essay

FIELDS, TEMPLATES = load_catalog()


def test_catalog_integrity():
    assert TEMPLATES, "テンプレートが空"
    for t in TEMPLATES.values():
        assert t.field_id in FIELDS


def test_params_reproducible():
    t = TEMPLATES["pm_vdrop_3ph"]
    assert sample_params(t, 42) == sample_params(t, 42)
    # 別 seed では(ほぼ確実に)異なる
    assert sample_params(t, 1) != sample_params(t, 2)


def test_round_sig():
    assert round_sig(1234.5, 3) == 1230.0
    assert round_sig(0.0, 3) == 0.0
    assert round_sig(0.012345, 2) == 0.012


def test_vdrop_matches_independent_calc():
    """solver の答えを、テスト側の独立計算と突合する(計算の信頼性検証)。"""
    t = TEMPLATES["pm_vdrop_3ph"]
    for seed in range(5):
        p = generate(t, seed)
        a = p.params
        sinphi = math.sqrt(1 - a["pf"] ** 2)
        cur = a["P"] / (math.sqrt(3) * a["Vr"] * a["pf"])
        vd = math.sqrt(3) * cur * (a["R"] * a["pf"] + a["X"] * sinphi)
        assert p.answer is not None
        assert p.answer.value == round_sig(vd, 3)


def test_generate_reproducible_and_valid():
    t = TEMPLATES["pm_vdrop_3ph"]
    p1 = generate(t, 7)
    p2 = generate(t, 7)
    assert p1.answer.value == p2.answer.value
    assert validate_calc(p1, t).ok


@pytest.mark.parametrize("tid", ["pm_vdrop_3ph", "mc_sync_vreg"])
def test_calc_templates_validate(tid):
    t = TEMPLATES[tid]
    for seed in range(8):
        p = generate(t, seed)
        res = validate_calc(p, t)
        assert res.ok, f"{tid}#{seed}: {res}"
        assert res.answer_in_text


def test_sync_vreg_positive_and_bounded():
    """電圧変動率は遅れ力率なら正で、非現実的に大きくないこと(サニティ)。"""
    t = TEMPLATES["mc_sync_vreg"]
    for seed in range(8):
        p = generate(t, seed)
        assert p.answer.value is not None
        assert 0 < p.answer.value < 100


def test_essay_rubric_coverage():
    t = TEMPLATES["pm_loss_reduction"]
    p = generate(t, 1)
    assert p.type == ProblemType.ESSAY
    res = validate_essay(p, t)
    assert res.ok
    assert res.coverage >= 0.6
