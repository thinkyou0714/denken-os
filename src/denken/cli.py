"""denken CLI: テンプレ一覧 / 類題生成 / 検証。"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from denken.catalog import DEFAULT_DATA_DIR, load_catalog
from denken.generate import generate, generate_validated
from denken.llm import get_backend
from denken.models import ProblemType
from denken.problemset import build_set
from denken.render import write_index, write_problem
from denken.validate import validate_calc, validate_essay


def _cmd_list(args: argparse.Namespace) -> int:
    fields, templates = load_catalog(args.data)
    print("== 分野 ==")
    for f in fields.values():
        print(f"  {f.id}: {f.subject.value} / {f.category} / {f.subcategory}")
    print("== テンプレート ==")
    for t in templates.values():
        print(f"  {t.id} [{t.type.value}/{t.difficulty}] {t.title}  (field={t.field_id})")
    return 0


def _cmd_gen(args: argparse.Namespace) -> int:
    fields, templates = load_catalog(args.data)
    if args.template not in templates:
        print(f"unknown template: {args.template}", file=sys.stderr)
        return 2
    template = templates[args.template]
    field = fields[template.field_id]
    if args.backend == "ollama":
        backend = get_backend("ollama", model=args.model)
    else:
        backend = get_backend(args.backend)
    out_dir = Path(args.out)

    difficulty = args.difficulty or None
    if difficulty and difficulty not in template.variants and difficulty != template.difficulty:
        print(
            f"note: template {template.id} に難易度 '{difficulty}' の variant が無いため "
            f"基本パラメータで生成します",
            file=sys.stderr,
        )
    failures = 0
    for i in range(args.count):
        seed = args.seed + i
        problem, ok = generate_validated(
            template,
            seed,
            backend=backend,
            attempts=args.attempts,
            with_figures=not args.no_figures,
            assets_dir=out_dir,
            difficulty=difficulty,
        )
        mcq = None
        if args.mcq and template.type == ProblemType.CALC:
            from denken.mcq import build_mcq

            mcq = build_mcq(template, problem, n_choices=args.choices)
        path = write_problem(problem, field, template, out_dir, mcq=mcq)
        flag = "" if ok else "  [WARN: 検証不合格]"
        if not ok:
            failures += 1
        print(f"generated: {path}{flag}")
    return 1 if failures else 0


_SCAFFOLD_CALC = """\
id: __ID__
field_id: __FIELD__
type: calc
title: "（タイトルを記入）"
difficulty: applied

# パラメータ(seed から決定論的にサンプリングされる)
params:
  - {name: x, kind: choice, choices: [1.0, 2.0], unit: ""}

# 上から順に評価。前の name を参照可。単位換算を式に直書きすると表示が崩れるので
# 表示重視なら solution_template で記号式を明示する(docs/templates.md 参照)。
expressions:
  y: "x*2"

answer:
  expr: y
  unit: ""
  sig_figs: 3
  # sane_min: 0
  # sane_max: 100

statement_template: "x = {x} のとき y = 2x を求めよ。"
explanation_template: "y = 2x。本問では y = {answer}。"

# 記述式の採点基準(配点)
scoring:
  - {criterion: "立式と計算", points: 1}

# よくある誤り(誤った式→誤答値。正答と一致しないこと)
# pitfalls:
#   - {label: "係数を誤る", expr: "x*3", note: "y = 2x が正しい"}
"""

_SCAFFOLD_ESSAY = """\
id: __ID__
field_id: __FIELD__
type: essay
title: "（タイトルを記入）"
difficulty: exam

statement_template: "（論述の問いを記入）"
# 模範解答。rubric の keywords を必ず本文に含めること(被覆率で採点するため)。
explanation_template: "模範解答(観点 を含めて記述する)。"

rubric:
  - {point: "観点1", keywords: ["観点"], weight: 1}
"""


def _cmd_new_template(args: argparse.Namespace) -> int:
    """テンプレートの雛形(検証を通る最小構成)を生成する (アイデア#74)。"""
    fields, templates = load_catalog(args.data)
    if args.id in templates:
        print(f"template id already exists: {args.id}", file=sys.stderr)
        return 2
    if args.field not in fields:
        print(f"unknown field_id: {args.field}(候補: {sorted(fields)})", file=sys.stderr)
        return 2
    body = (_SCAFFOLD_ESSAY if args.type == "essay" else _SCAFFOLD_CALC)
    body = body.replace("__ID__", args.id).replace("__FIELD__", args.field)
    out = Path(args.out) if args.out else (args.data / "templates" / f"{args.id}.yaml")
    if out.exists():
        print(f"file already exists: {out}", file=sys.stderr)
        return 2
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(body, encoding="utf-8")
    print(f"created: {out}(編集後 `denken check` で検証してください)")
    return 0


def _cmd_schema(args: argparse.Namespace) -> int:
    """Template の JSON Schema を出力する(エディタ補完・仕様参照用)。"""
    import json

    from denken.models import Template

    text = json.dumps(Template.model_json_schema(), ensure_ascii=False, indent=2)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(f"wrote schema: {args.out}")
    else:
        print(text)
    return 0


def _cmd_validate(args: argparse.Namespace) -> int:
    _fields, templates = load_catalog(args.data)
    template = templates[args.template]
    problem = generate(template, args.seed, backend=get_backend("stub"))
    if template.type == ProblemType.CALC:
        calc = validate_calc(problem, template)
        print(calc.model_dump_json(indent=2))
        return 0 if calc.ok else 1
    essay = validate_essay(problem, template)
    print(essay.model_dump_json(indent=2))
    return 0 if essay.ok else 1


def _cmd_set(args: argparse.Namespace) -> int:
    """重複しない問題セット(模試/問題集)を生成する (アイデア#56, #78)。"""
    from denken.problemset import EXAM_PRESETS, build_blueprint_set, parse_blueprint

    fields, templates = load_catalog(args.data)
    out_dir = Path(args.out)
    difficulty = args.difficulty or None

    # ブループリント(科目×問題数)指定があればそれに従う
    blueprint: dict[str, int] | None = None
    if args.exam:
        blueprint = EXAM_PRESETS[args.exam]
    elif args.blueprint:
        try:
            blueprint = parse_blueprint(args.blueprint)
        except ValueError as e:
            print(str(e), file=sys.stderr)
            return 2

    if blueprint is not None:
        subjects = {fields[t.field_id].subject.value for t in templates.values()}
        unknown = [s for s in blueprint if s not in subjects]
        if unknown:
            print(f"unknown subjects: {unknown}(候補: {sorted(subjects)})", file=sys.stderr)
            return 2
        groups: dict[str, list] = {}
        for t in templates.values():
            groups.setdefault(fields[t.field_id].subject.value, []).append(t)
        problems = build_blueprint_set(
            groups,
            blueprint,
            start_seed=args.seed,
            with_figures=not args.no_figures,
            assets_dir=out_dir,
            difficulty=difficulty,
        )
        requested = sum(blueprint.values())
    else:
        if args.templates:
            ids = [s.strip() for s in args.templates.split(",") if s.strip()]
            unknown = [i for i in ids if i not in templates]
            if unknown:
                print(f"unknown templates: {unknown}", file=sys.stderr)
                return 2
            selected = [templates[i] for i in ids]
        else:
            selected = list(templates.values())
        problems = build_set(
            selected,
            args.count,
            start_seed=args.seed,
            with_figures=not args.no_figures,
            assets_dir=out_dir,
            difficulty=difficulty,
        )
        requested = args.count

    for p in problems:
        write_problem(p, fields[p.field_id], templates[p.template_id], out_dir)
    index = write_index(problems, fields, templates, out_dir)
    print(f"generated {len(problems)} problems (requested {requested}) -> {index}")
    if len(problems) < requested:
        print("note: 組合せ空間が有限のため要求数に満たない問題セットです")
    return 0


def _cmd_check(args: argparse.Namespace) -> int:
    """全テンプレートを複数 seed で生成・検証し、次元整合も確認する (アイデア#62, #83, #99)。"""
    from denken.generate import template_difficulties
    from denken.units import check_dimensions
    from denken.validate import check_pitfalls

    _, templates = load_catalog(args.data)
    bad = 0
    dim_bad = 0
    pitfall_bad = 0
    checked = 0
    for tid, template in templates.items():
        # base と全難易度 variant を検証する(難易度導入で増えた検証経路を塞ぐ)
        for diff in template_difficulties(template):
            label = diff or "base"
            for seed in range(args.seeds):
                _problem, ok = generate_validated(template, seed, attempts=1, difficulty=diff)
                checked += 1
                if not ok:
                    bad += 1
                    print(f"NG  {tid}[{label}]#{seed}")
            for plabel in check_pitfalls(template, difficulty=diff):
                pitfall_bad += 1
                print(f"PITFALL NG  {tid}[{label}]: よくある誤り『{plabel}』が正答と一致")
        dim = check_dimensions(template)
        if not dim.ok:
            dim_bad += 1
            print(f"DIM NG  {tid}: {dim.detail} ({dim.answer_dim} != {dim.expected_dim})")
        elif not dim.checked:
            print(f"DIM ??  {tid}: {dim.detail}")
        if template.type == ProblemType.CALC and not template.scoring:
            print(f"SCORING ??  {tid}: 採点基準(scoring)が未設定")
    print(
        f"checked {checked} problems across {len(templates)} templates "
        f"(incl. difficulty variants): {bad} failed, "
        f"dimension mismatches: {dim_bad}, pitfall issues: {pitfall_bad}"
    )
    return 1 if (bad or dim_bad or pitfall_bad) else 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="denken", description="電験二種 類題生成エンジン")
    p.add_argument("--data", type=Path, default=DEFAULT_DATA_DIR, help="data ディレクトリ")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="分野とテンプレートを一覧表示").set_defaults(func=_cmd_list)

    g = sub.add_parser("gen", help="類題を生成")
    g.add_argument("--template", required=True)
    g.add_argument("--seed", type=int, default=1)
    g.add_argument("--count", type=int, default=1)
    g.add_argument("--backend", choices=["stub", "ollama"], default="stub")
    g.add_argument("--model", default="qwen2.5:14b")
    g.add_argument("--attempts", type=int, default=3, help="検証に通るまでの再生成回数")
    g.add_argument(
        "--difficulty",
        choices=["basic", "applied", "exam"],
        default="",
        help="難易度 variant(テンプレに定義があれば適用)",
    )
    g.add_argument("--no-figures", action="store_true")
    g.add_argument("--mcq", action="store_true", help="五肢択一(MCQ)形式で出力(一次向け)")
    g.add_argument("--choices", type=int, default=5, help="MCQ の選択肢数")
    g.add_argument("--out", default="generated")
    g.set_defaults(func=_cmd_gen)

    v = sub.add_parser("validate", help="生成物を検証")
    v.add_argument("--template", required=True)
    v.add_argument("--seed", type=int, default=1)
    v.set_defaults(func=_cmd_validate)

    s = sub.add_parser("set", help="重複しない問題セット(模試/問題集)を生成")
    s.add_argument("--count", type=int, default=10)
    s.add_argument("--seed", type=int, default=0)
    s.add_argument("--templates", default="", help="カンマ区切りのテンプレID(未指定なら全件)")
    s.add_argument(
        "--blueprint",
        default="",
        help="科目別配分 '理論=3,機械・制御=2'(指定時は --count より優先)",
    )
    s.add_argument(
        "--exam",
        choices=["2ji", "1ji-theory"],
        default="",
        help="出題構成プリセット(2ji=電力管理4+機械制御2 等)",
    )
    s.add_argument(
        "--difficulty",
        choices=["basic", "applied", "exam"],
        default="",
        help="難易度 variant(各テンプレに定義があれば適用)",
    )
    s.add_argument("--no-figures", action="store_true")
    s.add_argument("--out", default="problemset")
    s.set_defaults(func=_cmd_set)

    c = sub.add_parser("check", help="全テンプレートを複数 seed で検証")
    c.add_argument("--seeds", type=int, default=10)
    c.set_defaults(func=_cmd_check)

    nt = sub.add_parser("new-template", help="テンプレ雛形を生成(検証を通る最小構成)")
    nt.add_argument("--id", required=True)
    nt.add_argument("--field", required=True, help="field_id(fields.json のいずれか)")
    nt.add_argument("--type", choices=["calc", "essay"], default="calc")
    nt.add_argument("--out", default="", help="出力先(既定: data/templates/<id>.yaml)")
    nt.set_defaults(func=_cmd_new_template)

    sc = sub.add_parser("schema", help="Template の JSON Schema を出力")
    sc.add_argument("--out", default="")
    sc.set_defaults(func=_cmd_schema)
    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
