"""問題セット(模試・問題集)の構築。

複数テンプレートから、重複しない同型問題をラウンドロビンで集めてバランスよく出題する
(アイデア#56, #78)。各テンプレートはパラメータ組合せが互いに異なる問題のみ寄与する。
"""

from __future__ import annotations

from pathlib import Path

from denken.generate import generate, iter_distinct_seeds
from denken.llm import LLMBackend
from denken.models import Problem, Template


def build_set(
    templates: list[Template],
    total: int,
    *,
    start_seed: int = 0,
    backend: LLMBackend | None = None,
    with_figures: bool = False,
    assets_dir: Path | None = None,
) -> list[Problem]:
    """total 問の問題セットを作る。テンプレ間はラウンドロビン、各テンプレ内は重複なし。

    あるテンプレの組合せ空間を使い切ったら他テンプレで埋める。全テンプレが尽きれば
    total 未満で打ち切る。
    """
    if not templates:
        return []
    seeds = {t.id: iter_distinct_seeds(t, total, start_seed) for t in templates}
    pos = {t.id: 0 for t in templates}

    problems: list[Problem] = []
    n = len(templates)
    ti = 0
    consecutive_misses = 0
    while len(problems) < total and consecutive_misses < n:
        t = templates[ti % n]
        ti += 1
        i = pos[t.id]
        if i < len(seeds[t.id]):
            problems.append(
                generate(
                    t,
                    seeds[t.id][i],
                    backend=backend,
                    with_figures=with_figures,
                    assets_dir=assets_dir,
                )
            )
            pos[t.id] += 1
            consecutive_misses = 0
        else:
            consecutive_misses += 1
    return problems
