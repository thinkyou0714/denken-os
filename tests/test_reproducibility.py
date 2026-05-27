from __future__ import annotations

from denken.catalog import load_catalog
from denken.generate import generate

FIELDS, TEMPLATES = load_catalog()


def test_problem_json_is_byte_identical_across_runs():
    """同じ (template, seed) は完全に同一の JSON を生成する(created_at で揺れない)。"""
    t = TEMPLATES["th_rlc_series"]
    a = generate(t, 3).model_dump_json()
    b = generate(t, 3).model_dump_json()
    assert a == b


def test_created_at_is_none_by_default():
    p = generate(TEMPLATES["pm_vdrop_3ph"], 1)
    assert p.created_at is None  # 再現性のため時刻は既定で付与しない


def test_content_hash_stable_and_seed_sensitive():
    t = TEMPLATES["th_rlc_series"]
    h1 = generate(t, 3).content_hash
    assert h1 and h1 == generate(t, 3).content_hash
    assert h1 != generate(t, 4).content_hash  # seed が違えば内容も違う


def test_content_hash_independent_of_figures(tmp_path):
    """ハッシュは内容(params/答え/本文)由来。図の有無で変わらない。"""
    t = TEMPLATES["th_rlc_series"]
    no_fig = generate(t, 3).content_hash
    with_fig = generate(t, 3, with_figures=True, assets_dir=tmp_path).content_hash
    assert no_fig == with_fig
