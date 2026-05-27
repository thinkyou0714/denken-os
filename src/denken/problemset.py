"""問題セット(模試・問題集)の構築。

複数テンプレートから、重複しない同型問題をラウンドロビンで集めてバランスよく出題する
(アイデア#56, #78)。各テンプレートはパラメータ組合せが互いに異なる問題のみ寄与する。
"""

from __future__ import annotations

from pathlib import Path

from denken.generate import generate, iter_distinct_seeds
from denken.llm import LLMBackend
from denken.models import Problem, Template

# 実際の電験二種の出題構成に基づくプリセット(科目名 -> 問題数)
EXAM_PRESETS: dict[str, dict[str, int]] = {
    "2ji": {"電力・管理": 4, "機械・制御": 2},  # 二次: 選択して解答する問題数
    "1ji-theory": {"理論": 7},  # 一次・理論: A問題4 + B問題3
}


def parse_blueprint(spec: str) -> dict[str, int]:
    """'理論=3,機械・制御=2' をパースして {科目: 問題数} を返す。"""
    blueprint: dict[str, int] = {}
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "=" not in part:
            raise ValueError(f"blueprint の書式が不正: '{part}'(期待: 科目=問題数)")
        key, _, val = part.partition("=")
        blueprint[key.strip()] = int(val.strip())
    return blueprint


def build_set(
    templates: list[Template],
    total: int,
    *,
    start_seed: int = 0,
    backend: LLMBackend | None = None,
    with_figures: bool = False,
    assets_dir: Path | None = None,
    difficulty: str | None = None,
) -> list[Problem]:
    """total 問の問題セットを作る。テンプレ間はラウンドロビン、各テンプレ内は重複なし。

    あるテンプレの組合せ空間を使い切ったら他テンプレで埋める。全テンプレが尽きれば
    total 未満で打ち切る。difficulty を与えると、その variant がある場合は適用する。
    """
    if not templates:
        return []
    seeds = {
        t.id: iter_distinct_seeds(t, total, start_seed, difficulty=difficulty) for t in templates
    }
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
                    difficulty=difficulty,
                )
            )
            pos[t.id] += 1
            consecutive_misses = 0
        else:
            consecutive_misses += 1
    return problems


def build_blueprint_set(
    groups: dict[str, list[Template]],
    blueprint: dict[str, int],
    *,
    start_seed: int = 0,
    backend: LLMBackend | None = None,
    with_figures: bool = False,
    assets_dir: Path | None = None,
    difficulty: str | None = None,
) -> list[Problem]:
    """ブループリント(科目 -> 問題数)に従って問題セットを組成する (アイデア#78)。

    groups は科目名 -> その科目のテンプレ一覧。各科目は build_set で重複なく充足する。
    """
    problems: list[Problem] = []
    for subject, n in blueprint.items():
        problems += build_set(
            groups.get(subject, []),
            n,
            start_seed=start_seed,
            backend=backend,
            with_figures=with_figures,
            assets_dir=assets_dir,
            difficulty=difficulty,
        )
    return problems
