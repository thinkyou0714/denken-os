"""単位・次元の整合検証 (アイデア#62)。

テンプレートの式を pint の物理量で評価し、最終解答の次元が宣言単位と一致するかを
検証する。`Vd = I + R`(A+Ω)のような単位バグを **オーサリング時に** 検出できる。

設計方針:
- 解答式が依存する式だけを評価する(三角関数など評価困難な補助式を避ける)。
- pint.DimensionalityError は「明確な単位バグ」として ok=False。
- それ以外の例外(未対応関数など)は「検証不能」として checked=False(ビルドは止めない)。
"""

from __future__ import annotations

from pydantic import BaseModel

from denken.models import ProblemType, Template
from denken.solver import parse_expr

# テンプレート単位文字列 -> pint 単位名。
# 注: 次元のみ検証するため、VA/var(皮相・無効電力)は同じ次元[power]の watt 系へ写像する。
_UNIT_ALIASES: dict[str, str | None] = {
    "": None,
    "ohm": "ohm",
    "%": "percent",
    "uF": "microfarad",
    "uH": "microhenry",
    "VA": "watt",
    "kVA": "kilowatt",
    "var": "watt",
    "kvar": "kilowatt",
    "deg": "degree",
}


class DimResult(BaseModel):
    template_id: str
    ok: bool  # 次元が一致(または検証不能で問題なし)
    checked: bool  # 実際に次元評価ができたか
    answer_dim: str = ""
    expected_dim: str = ""
    detail: str = ""


def _to_quantity(ureg, unit: str):
    norm = _UNIT_ALIASES.get(unit, unit)
    if not norm:
        return 1.0 * ureg.dimensionless
    return 1.0 * ureg(norm)


def _dependency_closure(
    target: str, expressions: dict[str, str], param_names: set[str]
) -> set[str]:
    """target(解答式名)が依存する式名の推移閉包。"""
    all_names = set(expressions) | param_names
    deps: set[str] = set()

    def visit(name: str) -> None:
        if name in deps or name not in expressions:
            return
        deps.add(name)
        expr = parse_expr(expressions[name], all_names)
        for sym in expr.free_symbols:
            if sym.name in expressions:
                visit(sym.name)

    visit(target)
    return deps


def check_dimensions(template: Template) -> DimResult:
    if template.type != ProblemType.CALC or template.answer is None:
        return DimResult(template_id=template.id, ok=True, checked=False, detail="非計算問題")

    import pint

    ureg = pint.UnitRegistry()
    names = {p.name for p in template.params} | set(template.expressions)
    qty: dict[str, object] = {p.name: _to_quantity(ureg, p.unit) for p in template.params}

    target = template.answer.expr
    closure = _dependency_closure(target, template.expressions, {p.name for p in template.params})

    try:
        from sympy import lambdify

        for name, expr_str in template.expressions.items():
            if name not in closure:
                continue
            expr = parse_expr(expr_str, names)
            syms = sorted(expr.free_symbols, key=lambda s: s.name)
            fn = lambdify(syms, expr, modules=[{"sqrt": lambda x: x**0.5}, "math"])
            qty[name] = fn(*[qty[s.name] for s in syms])

        result = qty[target]
        expected = _to_quantity(ureg, template.answer.unit)
        result_dim = result.dimensionality  # type: ignore[union-attr]
        expected_dim = expected.dimensionality
        ok = result_dim == expected_dim
        return DimResult(
            template_id=template.id,
            ok=ok,
            checked=True,
            answer_dim=str(result_dim),
            expected_dim=str(expected_dim),
            detail="" if ok else "解答式の次元が宣言単位と不一致",
        )
    except pint.DimensionalityError as e:
        return DimResult(
            template_id=template.id,
            ok=False,
            checked=True,
            detail=f"式中で次元不整合: {e}",
        )
    except Exception as e:  # noqa: BLE001 - 評価不能は「検証不能」扱いでビルドは止めない
        return DimResult(
            template_id=template.id,
            ok=True,
            checked=False,
            detail=f"次元評価をスキップ: {type(e).__name__}: {e}",
        )
