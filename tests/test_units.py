from __future__ import annotations

import importlib.util

import pytest

from denken.catalog import load_catalog
from denken.models import AnswerSpec, ParamSpec, ProblemType, Template

_HAS_PINT = importlib.util.find_spec("pint") is not None
pytestmark = pytest.mark.skipif(not _HAS_PINT, reason="pint 未導入")

FIELDS, TEMPLATES = load_catalog()


def test_all_calc_templates_dimensionally_consistent():
    from denken.units import check_dimensions

    for t in TEMPLATES.values():
        if t.type != ProblemType.CALC:
            continue
        res = check_dimensions(t)
        assert res.checked, f"{t.id}: 次元評価不能 ({res.detail})"
        assert res.ok, f"{t.id}: {res.detail} ({res.answer_dim} != {res.expected_dim})"


def test_detects_unit_bug():
    """A + Ω のような単位バグを検出する。"""
    from denken.units import check_dimensions

    bad = Template(
        id="bad_units",
        field_id="pm-transmission-vdrop",
        type=ProblemType.CALC,
        title="x",
        params=[
            ParamSpec(name="Icur", kind="choice", choices=[1.0], unit="A"),
            ParamSpec(name="R", kind="choice", choices=[1.0], unit="ohm"),
        ],
        expressions={"bad": "Icur + R"},
        answer=AnswerSpec(expr="bad", unit="V"),
    )
    res = check_dimensions(bad)
    assert res.checked
    assert not res.ok


def test_detects_wrong_declared_unit():
    """式は健全でも宣言単位が間違っていれば不一致を検出する。"""
    from denken.units import check_dimensions

    wrong = Template(
        id="wrong_unit",
        field_id="pm-transmission-vdrop",
        type=ProblemType.CALC,
        title="x",
        params=[ParamSpec(name="Icur", kind="choice", choices=[2.0], unit="A")],
        expressions={"p": "Icur*Icur"},  # A^2 (電流の2乗) なのに V と宣言
        answer=AnswerSpec(expr="p", unit="V"),
    )
    res = check_dimensions(wrong)
    assert res.checked
    assert not res.ok
