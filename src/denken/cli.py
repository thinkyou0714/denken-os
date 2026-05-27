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
        )
        path = write_problem(problem, field, template, out_dir)
        flag = "" if ok else "  [WARN: 検証不合格]"
        if not ok:
            failures += 1
        print(f"generated: {path}{flag}")
    return 1 if failures else 0


def _cmd_validate(args: argparse.Namespace) -> int:
    fields, templates = load_catalog(args.data)
    template = templates[args.template]
    problem = generate(template, args.seed, backend=get_backend("stub"))
    if template.type == ProblemType.CALC:
        res = validate_calc(problem, template)
        print(res.model_dump_json(indent=2))
        return 0 if res.ok else 1
    res = validate_essay(problem, template)
    print(res.model_dump_json(indent=2))
    return 0 if res.ok else 1


def _cmd_set(args: argparse.Namespace) -> int:
    """重複しない問題セット(模試/問題集)を生成する (アイデア#56, #78)。"""
    fields, templates = load_catalog(args.data)
    if args.templates:
        ids = [s.strip() for s in args.templates.split(",") if s.strip()]
        unknown = [i for i in ids if i not in templates]
        if unknown:
            print(f"unknown templates: {unknown}", file=sys.stderr)
            return 2
        selected = [templates[i] for i in ids]
    else:
        selected = list(templates.values())

    out_dir = Path(args.out)
    problems = build_set(
        selected,
        args.count,
        start_seed=args.seed,
        with_figures=not args.no_figures,
        assets_dir=out_dir,
    )
    for p in problems:
        write_problem(p, fields[p.field_id], templates[p.template_id], out_dir)
    index = write_index(problems, fields, templates, out_dir)
    print(f"generated {len(problems)} problems (requested {args.count}) -> {index}")
    if len(problems) < args.count:
        print("note: 組合せ空間が有限のため要求数に満たない問題セットです")
    return 0


def _cmd_check(args: argparse.Namespace) -> int:
    """全テンプレートを複数 seed で生成・検証し、次元整合も確認する (アイデア#62, #83, #99)。"""
    from denken.units import check_dimensions

    _, templates = load_catalog(args.data)
    bad = 0
    dim_bad = 0
    for tid, template in templates.items():
        for seed in range(args.seeds):
            _problem, ok = generate_validated(template, seed, attempts=1)
            if not ok:
                bad += 1
                print(f"NG  {tid}#{seed}")
        dim = check_dimensions(template)
        if not dim.ok:
            dim_bad += 1
            print(f"DIM NG  {tid}: {dim.detail} ({dim.answer_dim} != {dim.expected_dim})")
        elif not dim.checked:
            print(f"DIM ??  {tid}: {dim.detail}")
        if template.type == ProblemType.CALC and not template.scoring:
            print(f"SCORING ??  {tid}: 採点基準(scoring)が未設定")
    total = len(templates) * args.seeds
    print(
        f"checked {total} (templates={len(templates)} x seeds={args.seeds}): "
        f"{bad} failed, dimension mismatches: {dim_bad}"
    )
    return 1 if (bad or dim_bad) else 0


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
    g.add_argument("--no-figures", action="store_true")
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
    s.add_argument("--no-figures", action="store_true")
    s.add_argument("--out", default="problemset")
    s.set_defaults(func=_cmd_set)

    c = sub.add_parser("check", help="全テンプレートを複数 seed で検証")
    c.add_argument("--seeds", type=int, default=10)
    c.set_defaults(func=_cmd_check)
    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
