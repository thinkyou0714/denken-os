"""五肢択一(MCQ)の組み立て。一次試験の択一形式に対応する。

誤答選択肢(distractor)は「よくある誤り(pitfalls)」= 実際の誤りで到達する値を使う
(ベストプラクティス)。不足分のみ決定論的な撹乱で補い、正答との重複は除外する。
"""

from __future__ import annotations

import random

from pydantic import BaseModel

from denken.models import Problem, Template
from denken.solver import eval_expr, format_value, solve

# 不足時の撹乱係数(正答に掛ける)。重複は dedup で除外。
_PAD_FACTORS = [0.5, 2.0, 1.0 / 3**0.5, 3**0.5, 0.9, 1.1, 10.0, 0.1]
_LETTERS = "ABCDEFGH"


class Choice(BaseModel):
    letter: str
    display: str
    is_correct: bool
    rationale: str = ""


class MCQ(BaseModel):
    choices: list[Choice]
    correct_letter: str


def build_mcq(template: Template, problem: Problem, n_choices: int = 5) -> MCQ:
    """calc 問題から n 択の MCQ を作る。選択肢は seed で決定論的に並ぶ。"""
    if template.type.value != "calc" or template.answer is None or problem.answer is None:
        raise ValueError("MCQ は計算問題のみ対応")

    answer, values = solve(template, problem.params)
    unit, sig = answer.unit, template.answer.sig_figs
    correct = answer.display

    seen = {correct}
    wrong: list[tuple[str, str]] = []  # (display, rationale)

    # 1) よくある誤り由来(実際の誤りで到達する値=良い distractor)
    for pf in template.pitfalls:
        try:
            disp = format_value(eval_expr(template, values, pf.expr), unit, sig)
        except Exception:  # noqa: BLE001
            continue
        if disp not in seen:
            seen.add(disp)
            wrong.append((disp, pf.note or pf.label))

    # 2) 不足分のみ決定論的な撹乱で補う(重複・正答一致は除外)
    base = answer.value or 0.0
    for factor in _PAD_FACTORS:
        if len(wrong) >= n_choices - 1:
            break
        disp = format_value(base * factor, unit, sig)
        if disp not in seen:
            seen.add(disp)
            wrong.append((disp, "撹乱肢"))

    wrong = wrong[: n_choices - 1]
    items: list[tuple[str, bool, str]] = [(correct, True, "正答")]
    items += [(d, False, r) for d, r in wrong]

    random.Random(problem.seed).shuffle(items)
    choices: list[Choice] = []
    correct_letter = ""
    for i, (disp, ok, rationale) in enumerate(items):
        letter = _LETTERS[i]
        choices.append(Choice(letter=letter, display=disp, is_correct=ok, rationale=rationale))
        if ok:
            correct_letter = letter
    return MCQ(choices=choices, correct_letter=correct_letter)
