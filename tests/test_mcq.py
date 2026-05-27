from __future__ import annotations

from denken.catalog import load_catalog
from denken.generate import generate
from denken.mcq import build_mcq
from denken.render import to_markdown

FIELDS, TEMPLATES = load_catalog()


def test_mcq_has_one_correct_and_distinct_choices():
    t = TEMPLATES["th_rlc_series"]
    p = generate(t, 3)
    mcq = build_mcq(t, p, n_choices=5)
    assert len(mcq.choices) == 5
    correct = [c for c in mcq.choices if c.is_correct]
    assert len(correct) == 1
    # 正解の表示は問題の答えと一致
    assert correct[0].display == p.answer.display
    assert correct[0].letter == mcq.correct_letter
    # 選択肢はすべて異なる
    assert len({c.display for c in mcq.choices}) == 5


def test_mcq_is_deterministic():
    t = TEMPLATES["th_rlc_series"]
    p = generate(t, 3)
    a = build_mcq(t, p)
    b = build_mcq(t, p)
    assert [c.display for c in a.choices] == [c.display for c in b.choices]
    assert a.correct_letter == b.correct_letter


def test_mcq_uses_pitfall_distractors():
    """よくある誤りの値が誤答選択肢に含まれる。"""
    t = TEMPLATES["pm_vdrop_3ph"]
    p = generate(t, 3)
    mcq = build_mcq(t, p)
    displays = {c.display for c in mcq.choices}
    # √3 抜けの誤答(pitfall)が選択肢に入っている
    assert any(pf.display in displays for pf in p.pitfalls)


def test_mcq_markdown_section():
    t = TEMPLATES["th_rc_transient"]
    p = generate(t, 4)
    mcq = build_mcq(t, p)
    md = to_markdown(p, FIELDS[p.field_id], t, mcq=mcq)
    assert "## 選択肢" in md
    assert f"正解: ({mcq.correct_letter})" in md
