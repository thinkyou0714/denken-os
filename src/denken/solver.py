"""SymPy による厳密計算。LLM には計算させず、答えはここで確定する。

これが本エンジンの肝: ローカル LLM の算術ミスを構造的に排除する。
"""

from __future__ import annotations

from math import floor, log10
from typing import Any

import sympy

from denken.models import Answer, Template


class SolverError(ValueError):
    pass


def round_sig(x: float, sig: int) -> float:
    """有効数字 sig 桁に丸める。"""
    if x == 0 or not _finite(x):
        return 0.0
    return round(x, -int(floor(log10(abs(x)))) + (sig - 1))


def _finite(x: float) -> bool:
    return x == x and x not in (float("inf"), float("-inf"))


def _display(value: float, unit: str, sig: int) -> str:
    r = round_sig(value, sig)
    # 整数で表せるなら整数表示、そうでなければ %g
    text = str(int(r)) if r == int(r) and abs(r) < 1e15 else f"{r:.{sig}g}"
    return f"{text} {unit}".strip()


def parse_expr(expr_str: str, names: set[str]) -> sympy.Expr:
    """変数名を必ず Symbol として解釈する。

    SymPy は `I`(虚数単位), `E`(自然対数の底), `Eq`(等式), `N` などを予約済みのため、
    電流 I や起電力 E などの変数名と衝突する。names に挙げた識別子は Symbol で上書きし、
    sqrt/sin/cos/acos/pi など数学関数・定数はそのまま使えるようにする。
    """
    local = {n: sympy.Symbol(n) for n in names}
    return sympy.sympify(expr_str, locals=local, rational=False)


def evaluate(template: Template, params: dict[str, Any]) -> dict[str, float]:
    """expressions を上から順に評価し、name -> 数値 の辞書を返す。

    各式は params と「それより前に定義した式名」を参照できる。
    """
    values: dict[str, float] = {k: float(v) for k, v in params.items() if _is_number(v)}
    # choice などで文字列パラメータがあっても式評価には数値のみ使う
    names = {p.name for p in template.params} | set(template.expressions)

    for name, expr_str in template.expressions.items():
        try:
            expr = parse_expr(expr_str, names)
        except (sympy.SympifyError, SyntaxError, TypeError) as e:
            raise SolverError(f"template {template.id}: cannot parse '{name}': {e}") from e

        subs = {sympy.Symbol(k): v for k, v in values.items()}
        result = expr.subs(subs)
        free = result.free_symbols
        if free:
            raise SolverError(
                f"template {template.id}: expr '{name}' has undefined symbols {free}"
            )
        try:
            num = float(result.evalf())
        except (TypeError, ValueError) as e:
            raise SolverError(f"template {template.id}: expr '{name}' not numeric: {e}") from e
        if not _finite(num):
            raise SolverError(f"template {template.id}: expr '{name}' is not finite ({num})")
        values[name] = num

    return values


def solve(template: Template, params: dict[str, Any]) -> tuple[Answer, dict[str, float]]:
    """テンプレートの answer を計算し、(Answer, 全中間値) を返す。"""
    assert template.answer is not None
    values = evaluate(template, params)
    spec = template.answer
    if spec.expr not in values:
        raise SolverError(f"template {template.id}: answer.expr '{spec.expr}' not computed")
    raw = values[spec.expr]
    answer = Answer(
        value=round_sig(raw, spec.sig_figs),
        unit=spec.unit,
        display=_display(raw, spec.unit, spec.sig_figs),
    )
    return answer, values


def eval_expr(template: Template, values: dict[str, float], expr_str: str) -> float:
    """既に計算済みの values の文脈で任意の式を評価する(よくある誤りの誤答値などに使う)。"""
    names = {p.name for p in template.params} | set(template.expressions)
    expr = parse_expr(expr_str, names)
    result = expr.subs({sympy.Symbol(k): v for k, v in values.items()})
    if result.free_symbols:
        raise SolverError(
            f"template {template.id}: expr '{expr_str}' has undefined {result.free_symbols}"
        )
    num = float(result.evalf())
    if not _finite(num):
        raise SolverError(f"template {template.id}: expr '{expr_str}' is not finite ({num})")
    return num


def format_value(value: float, unit: str, sig: int) -> str:
    """solver と同じ規則で数値を表示する(誤答値の整形に使う)。"""
    return _display(value, unit, sig)


def _is_number(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)
