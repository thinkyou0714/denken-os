"""Pydantic data models: 分野マスタ / テンプレート / 生成問題.

著作権の不変条件: ここで定義する構造は「分野の地図」と「原理ベースの雛形」のみ。
参考書本文は一切保持しない。
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from denken import SCHEMA_VERSION


class Subject(StrEnum):
    """電験二種 二次試験の科目."""

    POWER_MANAGEMENT = "電力・管理"
    MACHINE_CONTROL = "機械・制御"


class ProblemType(StrEnum):
    CALC = "calc"  # 計算問題: 答えは solver で厳密に確定する
    ESSAY = "essay"  # 論説問題: rubric で品質を担保する


class FieldNode(BaseModel):
    """分野マスタの 1 ノード。PDF からは構造ラベルのみ取り込む。"""

    id: str
    subject: Subject
    category: str  # 大分野 (例: 送電系統)
    subcategory: str  # 小分野 (例: 電圧降下)
    source_label: str | None = None  # PDF 由来の章ラベル等 (本文ではない)


class ParamSpec(BaseModel):
    """テンプレートのパラメータ定義。seed 付きサンプラが読む。"""

    name: str
    kind: Literal["uniform_int", "uniform_float", "choice"]
    low: float | None = None
    high: float | None = None
    step: float | None = None  # uniform_int/float の刻み
    choices: list[Any] | None = None
    unit: str | None = None

    @model_validator(mode="after")
    def _check(self) -> ParamSpec:
        if self.kind == "choice":
            if not self.choices:
                raise ValueError(f"param {self.name}: choice requires 'choices'")
        else:
            if self.low is None or self.high is None:
                raise ValueError(f"param {self.name}: {self.kind} requires low/high")
            if self.high < self.low:
                raise ValueError(f"param {self.name}: high < low")
        return self


class AnswerSpec(BaseModel):
    """計算問題の答えの定義。"""

    expr: str  # expressions の中の最終式名
    unit: str = ""
    sig_figs: int = 3
    sane_min: float | None = None  # 物理的に妥当な下限 (任意)
    sane_max: float | None = None  # 物理的に妥当な上限 (任意)


class RubricItem(BaseModel):
    """論説問題の採点観点。"""

    point: str  # 観点の説明
    keywords: list[str]  # この観点を満たすと判定するためのキーワード (いずれか)
    weight: int = 1


class ScoringCriterion(BaseModel):
    """計算問題の採点基準(配点)。記述式の部分点を表す。"""

    criterion: str  # 観点 (例: 関係式の立式)
    points: int = Field(gt=0)  # 配点 (正の整数)


class FigureSpec(BaseModel):
    """図の生成指示。登録済みの generator (kind) を params/中間値から描画する。

    図は solver と同じ値から描かれるため、図・数値・答えが必ず一致する。
    role="technical" は数値正確性が必須(コード生成のみ許可)。
    role="decorative" は挿絵など精度不要な装飾(将来 raster 生成を許可する領域)。
    """

    kind: str  # figures.py の登録名 (例: phasor / single_line / waveform / bode)
    caption: str = ""
    role: Literal["technical", "decorative"] = "technical"
    options: dict[str, Any] = Field(default_factory=dict)


class Template(BaseModel):
    """問題雛形 (PrairieLearn の question.html + server.py に相当)。"""

    id: str
    field_id: str
    type: ProblemType
    title: str
    difficulty: Literal["basic", "applied", "exam"] = "applied"
    params: list[ParamSpec] = Field(default_factory=list)
    # calc 用: name -> sympy 文字列。上から順に評価し、前の name を参照可。
    expressions: dict[str, str] = Field(default_factory=dict)
    answer: AnswerSpec | None = None
    statement_template: str = ""  # {param}/{value} を埋める問題文 (オフラインでも有効)
    # 電験王スタイルの解法ステップ雛形。空なら expressions から自動生成する。
    solution_template: list[str] = Field(default_factory=list)
    explanation_template: str = ""  # 解説の雛形
    figures: list[FigureSpec] = Field(default_factory=list)
    rubric: list[RubricItem] = Field(default_factory=list)  # 論説用
    scoring: list[ScoringCriterion] = Field(default_factory=list)  # 計算用の採点基準(配点)
    prompt_hint: str = ""  # LLM への追加指示

    @model_validator(mode="after")
    def _check(self) -> Template:
        if self.type == ProblemType.CALC:
            if not self.expressions or self.answer is None:
                raise ValueError(f"template {self.id}: calc requires expressions+answer")
            if self.answer.expr not in self.expressions:
                raise ValueError(
                    f"template {self.id}: answer.expr '{self.answer.expr}' not in expressions"
                )
        if self.type == ProblemType.ESSAY and not self.rubric:
            raise ValueError(f"template {self.id}: essay requires rubric")
        return self


class Answer(BaseModel):
    value: float | None = None
    unit: str = ""
    display: str = ""  # 有効数字を反映した表示文字列


class FigureRef(BaseModel):
    path: str  # 生成された図への相対パス
    caption: str = ""
    alt: str = ""
    kind: str = ""  # 来歴: どの generator が描いたか
    role: str = "technical"  # technical / decorative
    provenance: str = "solver"  # solver値由来 / llm_code / raster など


class Problem(BaseModel):
    """生成された 1 問。再現性のため seed と model 名を保持する。"""

    id: str
    template_id: str
    field_id: str
    type: ProblemType
    difficulty: str = "applied"
    seed: int
    params: dict[str, Any]
    answer: Answer | None = None
    statement: str
    figures: list[FigureRef] = Field(default_factory=list)
    solution_steps: list[str] = Field(default_factory=list)
    scoring: list[ScoringCriterion] = Field(default_factory=list)
    explanation: str = ""
    model_name: str = "stub"
    schema_version: int = SCHEMA_VERSION
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
