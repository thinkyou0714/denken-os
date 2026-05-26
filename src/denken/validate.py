"""生成物の検証。計算問題は solver と突合、論説は rubric 充足率で採点。"""

from __future__ import annotations

import math

from pydantic import BaseModel

from denken.models import Problem, ProblemType, Template
from denken.solver import solve


class CalcValidation(BaseModel):
    ok: bool
    expected: float | None
    stored: float | None
    rel_error: float | None
    answer_in_text: bool
    in_range: bool = True


class EssayValidation(BaseModel):
    ok: bool
    coverage: float  # 0..1
    satisfied: list[str]
    missing: list[str]


def validate_calc(problem: Problem, template: Template, rel_tol: float = 1e-6) -> CalcValidation:
    """保存パラメータから答えを再計算し、保存値と一致するか確認する。"""
    answer, _ = solve(template, problem.params)
    expected = answer.value
    stored = problem.answer.value if problem.answer else None
    if expected is None or stored is None:
        return CalcValidation(
            ok=False, expected=expected, stored=stored, rel_error=None, answer_in_text=False
        )
    denom = max(abs(expected), 1e-12)
    rel = abs(expected - stored) / denom
    num_str = answer.display.split()[0]  # 単位を除いた数値部分
    in_text = num_str in problem.explanation or answer.display in problem.explanation

    spec = template.answer
    assert spec is not None
    in_range = True
    if spec.sane_min is not None and stored < spec.sane_min:
        in_range = False
    if spec.sane_max is not None and stored > spec.sane_max:
        in_range = False

    return CalcValidation(
        ok=(rel <= rel_tol and in_range),
        expected=expected,
        stored=stored,
        rel_error=rel,
        answer_in_text=in_text,
        in_range=in_range,
    )


def validate_essay(problem: Problem, template: Template, threshold: float = 0.6) -> EssayValidation:
    """rubric の各観点について、キーワードが解説に出現するかで充足を判定 (アイデア#69)。"""
    text = problem.statement + "\n" + problem.explanation
    total = sum(item.weight for item in template.rubric) or 1
    got = 0
    satisfied: list[str] = []
    missing: list[str] = []
    for item in template.rubric:
        if any(kw in text for kw in item.keywords):
            got += item.weight
            satisfied.append(item.point)
        else:
            missing.append(item.point)
    coverage = got / total
    return EssayValidation(
        ok=(coverage >= threshold), coverage=coverage, satisfied=satisfied, missing=missing
    )


def validate(problem: Problem, template: Template) -> bool:
    """種別に応じた検証の合否のみ返す簡易ヘルパ。"""
    if template.type == ProblemType.CALC:
        return validate_calc(problem, template).ok
    return validate_essay(problem, template).ok


def _isclose(a: float, b: float) -> bool:  # pragma: no cover - 予備
    return math.isclose(a, b, rel_tol=1e-6)
