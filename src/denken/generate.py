"""生成オーケストレーション: params → solve → figure → prose → Problem。

純関数パイプライン (アイデア#39)。各段は型付きで、同 seed なら同結果 (冪等)。
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from denken.figures import render_figures
from denken.llm import LLMBackend, ProseRequest, StubBackend
from denken.models import Answer, FigureRef, PitfallResult, Problem, ProblemType, Template
from denken.params import sample_params
from denken.solver import eval_expr, format_value, round_sig, solve


class GenerateError(ValueError):
    pass


def make_problem_id(template_id: str, seed: int) -> str:
    return f"{template_id}#{seed}"


def param_signature(params: dict[str, Any]) -> tuple:
    """パラメータ組合せの同一性キー。重複(同型問題)判定に使う。"""
    return tuple(sorted((k, params[k]) for k in params))


def iter_distinct_seeds(
    template: Template, count: int, start_seed: int = 0, cap_factor: int = 200
) -> list[int]:
    """パラメータ組合せが互いに異なる seed を最大 count 個返す (アイデア#56)。

    choice/整数パラメータが少ないテンプレートは取りうる組合せが有限なので、
    空間を使い切ったら count 未満でも打ち切る(重複問題の量産を防ぐ)。
    """
    seen: set[tuple] = set()
    seeds: list[int] = []
    seed = start_seed
    attempts = 0
    max_attempts = max(count * cap_factor, 1000)
    while len(seeds) < count and attempts < max_attempts:
        sig = param_signature(sample_params(template, seed))
        if sig not in seen:
            seen.add(sig)
            seeds.append(seed)
        seed += 1
        attempts += 1
    return seeds


def _safe_format(text: str, ctx: dict[str, Any], template_id: str) -> str:
    try:
        return text.format(**ctx)
    except (KeyError, IndexError) as e:
        raise GenerateError(f"template {template_id}: missing placeholder {e} in text") from e


def _auto_steps(template: Template, values: dict[str, float]) -> list[str]:
    """expressions から『記号式 = 数値』の導出ステップを LaTeX で自動生成 (アイデア#3, #30)。"""
    import sympy

    from denken.solver import parse_expr

    names = {p.name for p in template.params} | set(template.expressions)
    steps: list[str] = []
    for name, expr in template.expressions.items():
        try:
            latex = sympy.latex(parse_expr(expr, names))
        except Exception:  # noqa: BLE001 - 整形失敗時は素の式にフォールバック
            latex = expr
        steps.append(f"$ {name} = {latex} = {round_sig(values[name], 4)} $")
    return steps


def generate(
    template: Template,
    seed: int,
    *,
    backend: LLMBackend | None = None,
    with_figures: bool = False,
    assets_dir: Path | None = None,
) -> Problem:
    backend = backend or StubBackend()
    params = sample_params(template, seed)

    answer: Answer | None = None
    values: dict[str, float] = {}
    steps: list[str] = []
    if template.type == ProblemType.CALC:
        answer, values = solve(template, params)
        # values は solver 内で params を float 化して含むため、params を後置きして
        # 元の型(int 等)を優先する。これで問題文の "66000.0" 表示を防ぐ (根本原因修正)。
        step_ctx = {**values, **params, "answer": answer.display}
        steps = (
            [_safe_format(s, step_ctx, template.id) for s in template.solution_template]
            if template.solution_template
            else _auto_steps(template, values)
        )

    pitfalls: list[PitfallResult] = []
    if template.type == ProblemType.CALC and template.pitfalls and answer is not None:
        for pf in template.pitfalls:
            wrong = eval_expr(template, values, pf.expr)
            pitfalls.append(
                PitfallResult(
                    label=pf.label,
                    display=format_value(wrong, answer.unit, template.answer.sig_figs),
                    note=pf.note,
                )
            )

    ctx: dict[str, Any] = {**values, **params, "answer": answer.display if answer else ""}
    draft_statement = _safe_format(template.statement_template, ctx, template.id)
    draft_explanation = _safe_format(template.explanation_template, ctx, template.id)

    figures: list[FigureRef] = []
    if with_figures and template.figures and assets_dir is not None:
        figures = render_figures(
            template.figures,
            {**params, **values},
            assets_dir,
            make_problem_id(template.id, seed).replace("#", "_"),
        )

    prose = backend.write(
        ProseRequest(
            title=template.title,
            ptype=template.type.value,
            params=params,
            values={k: round_sig(v, 6) for k, v in values.items()},
            answer_display=answer.display if answer else "",
            prompt_hint=template.prompt_hint,
            draft_statement=draft_statement,
            draft_explanation=draft_explanation,
        )
    )

    return Problem(
        id=make_problem_id(template.id, seed),
        template_id=template.id,
        field_id=template.field_id,
        type=template.type,
        difficulty=template.difficulty,
        seed=seed,
        params=params,
        answer=answer,
        statement=prose.statement,
        figures=figures,
        solution_steps=steps,
        scoring=template.scoring,
        pitfalls=pitfalls,
        explanation=prose.explanation,
        model_name=backend.name,
    )


def generate_validated(
    template: Template,
    seed: int,
    *,
    backend: LLMBackend | None = None,
    attempts: int = 3,
    with_figures: bool = False,
    assets_dir: Path | None = None,
) -> tuple[Problem, bool]:
    """検証に通る問題を返す (best-of-N)。

    seed 固定なので params・答えは不変。LLM が数値を崩した場合などに prose を
    再生成して検証し直す (アイデア#45, #65, #69)。stub は決定的なので実質1回。
    """
    from denken.validate import validate as _validate

    last: Problem | None = None
    for _ in range(max(1, attempts)):
        problem = generate(
            template, seed, backend=backend, with_figures=with_figures, assets_dir=assets_dir
        )
        if _validate(problem, template):
            return problem, True
        last = problem
    assert last is not None
    return last, False
