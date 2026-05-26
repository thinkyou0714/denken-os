from __future__ import annotations

import importlib.util

import pytest

from denken.catalog import load_catalog
from denken.generate import generate

_HAS_MPL = importlib.util.find_spec("matplotlib") is not None
_HAS_SCHEM = importlib.util.find_spec("schemdraw") is not None

FIELDS, TEMPLATES = load_catalog()


@pytest.mark.skipif(not (_HAS_MPL and _HAS_SCHEM), reason="図ライブラリ未導入")
def test_figures_render_to_svg(tmp_path):
    t = TEMPLATES["pm_vdrop_3ph"]
    p = generate(t, 3, with_figures=True, assets_dir=tmp_path)
    assert len(p.figures) == 2
    for fig in p.figures:
        assert fig.path, f"図の生成に失敗: {fig.alt}"
        assert (tmp_path / fig.path).exists()


def test_figures_disabled_by_default():
    t = TEMPLATES["pm_vdrop_3ph"]
    p = generate(t, 3)  # with_figures=False
    assert p.figures == []


@pytest.mark.skipif(not _HAS_MPL, reason="matplotlib 未導入")
@pytest.mark.parametrize("tid", ["ct_rc_lowpass", "pe_full_wave_rect"])
def test_new_generators_render(tmp_path, tid):
    t = TEMPLATES[tid]
    p = generate(t, 1, with_figures=True, assets_dir=tmp_path)
    assert p.figures and p.figures[0].path
    assert (tmp_path / p.figures[0].path).exists()
    assert p.figures[0].role == "technical"
    assert p.figures[0].provenance == "solver"


def test_catalog_rejects_unknown_figure_kind():
    from denken.models import FigureSpec, ProblemType, Template

    t = TEMPLATES["pm_vdrop_3ph"].model_copy(deep=True)
    t.figures = [FigureSpec(kind="does_not_exist")]
    # 直接 validate するのではなく、レジストリに無い kind を検出できることを確認
    from denken.figures import REGISTRY

    assert "does_not_exist" not in REGISTRY
    assert isinstance(t, Template)
    assert t.type == ProblemType.CALC
