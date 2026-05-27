from __future__ import annotations

import yaml

from denken.cli import build_parser
from denken.generate import generate
from denken.models import ProblemType, Template
from denken.validate import validate, validate_essay


def _run(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


def test_new_template_calc_scaffold_is_valid_and_passes_validation(tmp_path):
    out = tmp_path / "t_calc.yaml"
    assert _run(["new-template", "--id", "t_calc", "--field", "th-ac-rlc", "--out", str(out)]) == 0
    t = Template.model_validate(yaml.safe_load(out.read_text(encoding="utf-8")))
    assert t.type == ProblemType.CALC
    p = generate(t, 1)
    assert validate(p, t)  # 雛形は検証(再計算+範囲+グラウンディング)を通る


def test_new_template_essay_scaffold_passes_rubric(tmp_path):
    out = tmp_path / "t_essay.yaml"
    rc = _run(
        ["new-template", "--id", "t_essay", "--field", "pm-loss-reduction", "--type", "essay",
         "--out", str(out)]
    )
    assert rc == 0
    t = Template.model_validate(yaml.safe_load(out.read_text(encoding="utf-8")))
    assert t.type == ProblemType.ESSAY
    p = generate(t, 1)
    assert validate_essay(p, t).ok


def test_new_template_rejects_unknown_field(tmp_path):
    out = tmp_path / "bad.yaml"
    assert _run(["new-template", "--id", "bad", "--field", "no-such-field", "--out", str(out)]) == 2
    assert not out.exists()


def test_schema_export_is_valid(capsys):
    assert _run(["schema"]) == 0
    import json

    schema = json.loads(capsys.readouterr().out)
    assert schema["type"] == "object"
    for key in ("id", "params", "answer", "figures", "scoring", "pitfalls", "variants"):
        assert key in schema["properties"], key
