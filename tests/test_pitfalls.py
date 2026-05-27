from __future__ import annotations

from denken.catalog import load_catalog
from denken.generate import generate
from denken.render import to_markdown
from denken.validate import check_pitfalls

FIELDS, TEMPLATES = load_catalog()


def test_pitfalls_differ_from_answer():
    """全テンプレのよくある誤りは正答と一致しない(=ちゃんと誤りになっている)。"""
    for t in TEMPLATES.values():
        assert check_pitfalls(t) == [], f"{t.id}: {check_pitfalls(t)}"


def test_pitfalls_flow_into_problem_and_markdown():
    t = TEMPLATES["pm_vdrop_3ph"]
    p = generate(t, 1)
    assert len(p.pitfalls) == len(t.pitfalls) >= 1
    # 誤答値は正答と異なる
    assert all(pf.display != p.answer.display for pf in p.pitfalls)
    md = to_markdown(p, FIELDS[p.field_id], t)
    assert "## よくある誤り" in md
    assert "√3 を掛け忘れる" in md


def test_no_pitfalls_no_section():
    t = TEMPLATES["mc_sync_vreg"]  # pitfalls 未設定
    p = generate(t, 1)
    assert p.pitfalls == []
    md = to_markdown(p, FIELDS[p.field_id], t)
    assert "## よくある誤り" not in md


def test_vdrop_sqrt3_pitfall_is_answer_over_sqrt3():
    """√3 抜けの誤答は正答の 1/√3 になっているはず。"""
    import math

    t = TEMPLATES["pm_vdrop_3ph"]
    p = generate(t, 2)
    correct = p.answer.value
    # 最初の pitfall = √3 を掛け忘れ
    wrong = float(p.pitfalls[0].display.split()[0])
    assert math.isclose(wrong, correct / math.sqrt(3), rel_tol=0.02)
