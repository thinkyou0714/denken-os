"""生成物の検証。計算問題は solver と突合、論説は rubric 充足率で採点。"""

from __future__ import annotations

import math
import re

from pydantic import BaseModel

from denken.models import Problem, ProblemType, Template
from denken.solver import solve

# 文中の数値トークン(カンマ区切り・小数・指数表記に対応)
_NUM_RE = re.compile(r"[-+]?\d[\d,]*\.?\d*(?:[eE][-+]?\d+)?")
# 技術文書に遍在し「誤答」とは無関係な構造的整数 (三相3, 2π, √2, 1線, 100%)
_STRUCTURAL = {0.0, 1.0, 2.0, 3.0, 100.0}


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


class NumericGrounding(BaseModel):
    ok: bool
    ungrounded: list[str]  # solver値・テンプレ定数で説明できない数値トークン


def _extract_numbers(text: str) -> list[tuple[str, float]]:
    out: list[tuple[str, float]] = []
    for m in _NUM_RE.finditer(text):
        tok = m.group()
        try:
            out.append((tok, float(tok.replace(",", ""))))
        except ValueError:
            continue
    return out


def _is_grounded(n: float, allowed: list[float], rel_tol: float = 0.02) -> bool:
    if n in _STRUCTURAL or (n.is_integer() and n in _STRUCTURAL):
        return True
    for a in allowed:
        if a == 0.0:
            if abs(n) < 1e-9:
                return True
        elif abs(n - a) / abs(a) <= rel_tol:
            return True
    return False


def check_numeric_grounding(problem: Problem, template: Template) -> NumericGrounding:
    """LLM が生成した問題文・解説中の数値が solver 値で説明できるかを検証 (アイデア#64)。

    核心テーゼ「LLM に計算させない」のガード。許容値は solver の全中間値・解答に加え、
    テンプレ文字列中の著作者承認済みリテラル(例: −3 dB, −45°, √2)を含める。
    stub は出力=テンプレ整形なので構造的に必ず合格する。
    """
    if template.type != ProblemType.CALC or template.answer is None:
        return NumericGrounding(ok=True, ungrounded=[])

    _answer, values = solve(template, problem.params)
    allowed: list[float] = list(values.values())
    if problem.answer and problem.answer.value is not None:
        allowed.append(problem.answer.value)
    # テンプレ文字列中のリテラル数値(ドメイン定数)を許容に加える
    literal_src = " ".join(
        [template.statement_template, template.explanation_template, *template.solution_template]
    )
    allowed += [v for _, v in _extract_numbers(literal_src)]

    ungrounded: list[str] = []
    for tok, n in _extract_numbers(problem.statement + "\n" + problem.explanation):
        if not _is_grounded(n, allowed):
            ungrounded.append(tok)
    return NumericGrounding(ok=(not ungrounded), ungrounded=ungrounded)


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
        return validate_calc(problem, template).ok and check_numeric_grounding(problem, template).ok
    return validate_essay(problem, template).ok


def _isclose(a: float, b: float) -> bool:  # pragma: no cover - 予備
    return math.isclose(a, b, rel_tol=1e-6)
