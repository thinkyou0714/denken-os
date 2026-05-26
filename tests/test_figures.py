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
