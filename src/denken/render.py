"""Obsidian 互換 markdown への出力。電験王スタイルの章立て + 図埋め込み + 囲み答え。"""

from __future__ import annotations

import json
from pathlib import Path

from denken.mcq import MCQ
from denken.models import FieldNode, Problem, ProblemType, Template


def _frontmatter(problem: Problem, field: FieldNode) -> str:
    lines = [
        "---",
        f"id: {problem.id}",
        f"template: {problem.template_id}",
        f"subject: {field.subject.value}",
        f"category: {field.category}",
        f"subcategory: {field.subcategory}",
        f"type: {problem.type.value}",
        f"difficulty: {problem.difficulty}",
        f"seed: {problem.seed}",
        f"model: {problem.model_name}",
        f"tags: [電験二種, {field.subject.value}, {field.category}]",
        "---",
    ]
    return "\n".join(lines)


def to_markdown(
    problem: Problem, field: FieldNode, template: Template, mcq: MCQ | None = None
) -> str:
    out: list[str] = [_frontmatter(problem, field), "", f"# {template.title}", ""]

    out += ["## 問題", "", problem.statement, ""]

    for fig in problem.figures:
        if fig.path:
            out.append(f"![{fig.alt}]({fig.path})")
            if fig.caption:
                out.append(f"*{fig.caption}*")
            out.append("")
        else:
            out += [f"> [!warning] 図を生成できませんでした: {fig.alt}", ""]

    if mcq is not None:
        out += ["## 選択肢", ""]
        for ch in mcq.choices:
            out.append(f"- ({ch.letter}) {ch.display}")
        out += ["", f"> [!success] 正解: ({mcq.correct_letter})", ""]

    if problem.type == ProblemType.CALC:
        out += ["## 解答", ""]
        for i, step in enumerate(problem.solution_steps, 1):
            out.append(f"{i}. {step}")
        out.append("")
        if problem.answer:
            out += ["> [!success] 答え", f"> {problem.answer.display}", ""]

        if problem.scoring:
            total = sum(c.points for c in problem.scoring)
            out += ["## 採点基準", "", "| 観点 | 配点 |", "|---|---|"]
            for c in problem.scoring:
                out.append(f"| {c.criterion} | {c.points} |")
            out += [f"| **合計** | **{total}** |", ""]

    if problem.explanation:
        out += ["## 解説", "", problem.explanation, ""]

    if problem.pitfalls:
        out += ["## よくある誤り", ""]
        for pf in problem.pitfalls:
            note = f" — {pf.note}" if pf.note else ""
            out.append(f"- **{pf.label}**: {pf.display}{note}")
        out.append("")

    return "\n".join(out)


def write_index(
    problems: list[Problem],
    fields: dict[str, FieldNode],
    templates: dict[str, Template],
    out_dir: Path,
) -> Path:
    """問題セットの目次(index.md)を書き出す。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    lines = [
        "# 問題セット",
        "",
        f"全 {len(problems)} 問",
        "",
        "| # | 科目 | 分類 | 難易度 | タイトル |",
        "|---|---|---|---|---|",
    ]
    for i, p in enumerate(problems, 1):
        field = fields[p.field_id]
        title = templates[p.template_id].title
        base = p.id.replace("#", "_")
        lines.append(
            f"| {i} | {field.subject.value} | {field.category} | {p.difficulty} | "
            f"[{title}]({base}.md) |"
        )
    path = out_dir / "index.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def write_problem(
    problem: Problem, field: FieldNode, template: Template, out_dir: Path, mcq: MCQ | None = None
) -> Path:
    """markdown と JSON を out_dir に書き出し、markdown のパスを返す。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    base = problem.id.replace("#", "_")
    md_path = out_dir / f"{base}.md"
    md_path.write_text(to_markdown(problem, field, template, mcq), encoding="utf-8")
    (out_dir / f"{base}.json").write_text(
        json.dumps(problem.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return md_path
