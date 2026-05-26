"""denken CLI: テンプレ一覧 / 類題生成 / 検証。"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from denken.catalog import DEFAULT_DATA_DIR, load_catalog
from denken.generate import generate, generate_validated
from denken.llm import get_backend
from denken.models import ProblemType
from denken.render import write_problem
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


def _cmd_check(args: argparse.Namespace) -> int:
    """全テンプレートを複数 seed で生成・検証する (アイデア#83, #99)。"""
    _, templates = load_catalog(args.data)
    bad = 0
    for tid, template in templates.items():
        for seed in range(args.seeds):
            problem, ok = generate_validated(template, seed, attempts=1)
            if not ok:
                bad += 1
                print(f"NG  {tid}#{seed}")
    total = len(templates) * args.seeds
    print(f"checked {total} (templates={len(templates)} x seeds={args.seeds}): {bad} failed")
    return 1 if bad else 0


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
