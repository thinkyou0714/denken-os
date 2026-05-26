"""seed 付きパラメータサンプラ。同じ seed なら必ず同じパラメータを返す (再現性)。"""

from __future__ import annotations

import random
from typing import Any

from denken.models import ParamSpec, Template


def _sample_one(spec: ParamSpec, rng: random.Random) -> Any:
    if spec.kind == "choice":
        return rng.choice(spec.choices)  # type: ignore[arg-type]

    low, high = float(spec.low), float(spec.high)  # type: ignore[arg-type]
    step = spec.step
    if spec.kind == "uniform_int":
        step = int(step) if step else 1
        n = (int(high) - int(low)) // step
        return int(low) + step * rng.randint(0, n)
    # uniform_float
    if step:
        n = round((high - low) / step)
        return round(low + step * rng.randint(0, n), 10)
    return rng.uniform(low, high)


def sample_params(template: Template, seed: int) -> dict[str, Any]:
    """テンプレートの全パラメータを seed から決定的にサンプリングする。"""
    rng = random.Random(seed)
    return {spec.name: _sample_one(spec, rng) for spec in template.params}
