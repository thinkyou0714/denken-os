from __future__ import annotations

import importlib.util
import math

import pytest

from denken.catalog import load_catalog
from denken.generate import generate

_HAS_MPL = importlib.util.find_spec("matplotlib") is not None
FIELDS, TEMPLATES = load_catalog()


def test_induction_slip_matches_independent_calc():
    t = TEMPLATES["mc_induction_slip"]
    for seed in range(8):
        p = generate(t, seed)
        a = p.params
        ns = 120 * a["f"] / a["p"]
        n = ns * (1 - a["s_in"])
        s_pct = (ns - n) / ns * 100
        assert math.isclose(p.answer.value, round(s_pct, 3), rel_tol=1e-6)
        assert 0 < p.answer.value <= 20


def test_three_phase_power_matches_independent_calc():
    t = TEMPLATES["th_three_phase_power"]
    for seed in range(8):
        p = generate(t, seed)
        a = p.params
        expected = math.sqrt(3) * a["V"] * a["I"] * a["pf"] / 1000
        # 表示は3桁丸めなので近接で比較
        assert math.isclose(p.answer.value, expected, rel_tol=0.01)


@pytest.mark.skipif(not _HAS_MPL, reason="matplotlib 未導入")
def test_slip_line_figure_renders(tmp_path):
    t = TEMPLATES["mc_induction_slip"]
    p = generate(t, 2, with_figures=True, assets_dir=tmp_path)
    assert p.figures and p.figures[0].path
    assert (tmp_path / p.figures[0].path).exists()
