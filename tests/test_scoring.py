from __future__ import annotations

import pytest
from pydantic import ValidationError

from denken.catalog import load_catalog
from denken.generate import generate
from denken.models import ProblemType, ScoringCriterion
from denken.render import to_markdown

FIELDS, TEMPLATES = load_catalog()


def test_all_calc_templates_have_scoring():
    for t in TEMPLATES.values():
        if t.type != ProblemType.CALC:
            continue
        assert t.scoring, f"{t.id}: 採点基準(scoring)が未設定"
        assert all(c.points > 0 for c in t.scoring)


def test_scoring_flows_into_problem_and_markdown():
    t = TEMPLATES["pm_vdrop_3ph"]
    p = generate(t, 1)
    assert p.scoring == t.scoring
    md = to_markdown(p, FIELDS[p.field_id], t)
    assert "## 採点基準" in md
    total = sum(c.points for c in t.scoring)
    assert f"**{total}**" in md  # 合計が表示される


def test_essay_has_no_scoring_section():
    t = TEMPLATES["pm_loss_reduction"]
    p = generate(t, 1)
    md = to_markdown(p, FIELDS[p.field_id], t)
    assert "## 採点基準" not in md


def test_scoring_points_must_be_positive():
    with pytest.raises(ValidationError):
        ScoringCriterion(criterion="x", points=0)
