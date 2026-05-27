from __future__ import annotations

import importlib.util

import pytest

from denken.catalog import load_catalog
from denken.generate import generate, generate_validated

_HAS_MPL = importlib.util.find_spec("matplotlib") is not None
FIELDS, TEMPLATES = load_catalog()
THEORY = ["th_rlc_series", "th_series_resonance", "th_rc_transient"]


@pytest.mark.parametrize("tid", THEORY)
def test_theory_templates_validate(tid):
    t = TEMPLATES[tid]
    for seed in range(6):
        _p, ok = generate_validated(t, seed)
        assert ok, f"{tid}#{seed} 検証不合格"


@pytest.mark.parametrize("tid", THEORY)
def test_theory_solution_steps_are_clean(tid):
    """整形済みステップ: 内部名や生の単位換算定数・指数表記が出ない。"""
    t = TEMPLATES[tid]
    p = generate(t, 1)
    joined = "\n".join(p.solution_steps)
    for bad in ("Icur", "tau_ms", "tau_s", "L_h", "C_f", "1e-", "0.002", "500000"):
        assert bad not in joined, f"{tid}: ステップに '{bad}' が露出"
    # 最終ステップは確定した答えと一致(有効数字のブレなし)
    assert p.answer.display in joined


def test_pitfall_unit_override():
    """RC過渡の『秒のまま』誤りは ms ではなく s で表示される。"""
    t = TEMPLATES["th_rc_transient"]
    p = generate(t, 4)
    sec = next(pf for pf in p.pitfalls if "秒のまま" in pf.label)
    assert sec.display.endswith(" s")


def test_hidden_exprs_excluded_from_steps():
    """phi_deg(図用)は解答ステップに出ない。"""
    for tid in ("pm_vdrop_3ph", "mc_sync_vreg"):
        p = generate(TEMPLATES[tid], 1)
        assert all("phi_deg" not in s for s in p.solution_steps)


@pytest.mark.skipif(not _HAS_MPL, reason="matplotlib 未導入")
@pytest.mark.parametrize("tid", THEORY)
def test_theory_figures_render(tmp_path, tid):
    p = generate(TEMPLATES[tid], 1, with_figures=True, assets_dir=tmp_path)
    assert p.figures and p.figures[0].path
    assert (tmp_path / p.figures[0].path).exists()
