from __future__ import annotations

import pytest

from denken.catalog import load_catalog
from denken.generate import iter_distinct_seeds, param_signature
from denken.params import sample_params
from denken.problemset import build_blueprint_set, build_set, parse_blueprint

FIELDS, TEMPLATES = load_catalog()


def _groups():
    g: dict[str, list] = {}
    for t in TEMPLATES.values():
        g.setdefault(FIELDS[t.field_id].subject.value, []).append(t)
    return g


def test_parse_blueprint():
    assert parse_blueprint("理論=3,機械・制御=2") == {"理論": 3, "機械・制御": 2}
    assert parse_blueprint(" 理論 = 1 ") == {"理論": 1}
    with pytest.raises(ValueError):
        parse_blueprint("理論")


def test_build_blueprint_set_honors_subject_counts():
    problems = build_blueprint_set(_groups(), {"理論": 3, "機械・制御": 2})
    from collections import Counter

    by_subject = Counter(FIELDS[p.field_id].subject.value for p in problems)
    assert by_subject["理論"] == 3
    assert by_subject["機械・制御"] == 2
    assert len({p.id for p in problems}) == len(problems)


def test_build_blueprint_set_2ji_preset_composition():
    from denken.problemset import EXAM_PRESETS

    problems = build_blueprint_set(_groups(), EXAM_PRESETS["2ji"])
    from collections import Counter

    by_subject = Counter(FIELDS[p.field_id].subject.value for p in problems)
    assert by_subject["電力・管理"] == 4
    assert by_subject["機械・制御"] == 2


def test_iter_distinct_seeds_are_unique():
    t = TEMPLATES["mc_sync_vreg"]
    seeds = iter_distinct_seeds(t, 20)
    sigs = {param_signature(sample_params(t, s)) for s in seeds}
    assert len(sigs) == len(seeds) == 20


def test_distinct_seeds_capped_by_finite_space():
    """V の3択しかない pe_full_wave_rect は最大3問しか作れない。"""
    t = TEMPLATES["pe_full_wave_rect"]
    seeds = iter_distinct_seeds(t, 10)
    assert len(seeds) == 3
    sigs = {param_signature(sample_params(t, s)) for s in seeds}
    assert len(sigs) == 3


def test_build_set_dedups_within_template():
    t = TEMPLATES["pe_full_wave_rect"]
    problems = build_set([t], 10)
    assert len(problems) == 3  # 空間が有限なので打ち切り
    sigs = {param_signature(p.params) for p in problems}
    assert len(sigs) == 3


def test_build_set_balances_and_fills_from_others():
    """有限空間のテンプレが尽きても他テンプレで total を埋める。"""
    small = TEMPLATES["pe_full_wave_rect"]  # 3
    big = TEMPLATES["mc_sync_vreg"]  # 225
    problems = build_set([small, big], 12)
    assert len(problems) == 12
    # small からは最大3問、残りは big から
    from collections import Counter

    by_t = Counter(p.template_id for p in problems)
    assert by_t["pe_full_wave_rect"] <= 3
    assert by_t["mc_sync_vreg"] >= 9


def test_build_set_total_distinct_ids():
    problems = build_set(list(TEMPLATES.values()), 15)
    assert len({p.id for p in problems}) == len(problems)
