"""分野マスタ(fields.json)とテンプレート(templates/*.yaml)の読み込み。"""

from __future__ import annotations

import json
from pathlib import Path

import yaml

from denken.models import FieldNode, Template

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATA_DIR = REPO_ROOT / "data"


def load_fields(data_dir: Path = DEFAULT_DATA_DIR) -> dict[str, FieldNode]:
    raw = json.loads((data_dir / "fields.json").read_text(encoding="utf-8"))
    fields = [FieldNode.model_validate(x) for x in raw]
    return {f.id: f for f in fields}


def load_templates(data_dir: Path = DEFAULT_DATA_DIR) -> dict[str, Template]:
    out: dict[str, Template] = {}
    for path in sorted((data_dir / "templates").glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        tmpl = Template.model_validate(data)
        if tmpl.id in out:
            raise ValueError(f"duplicate template id: {tmpl.id} ({path})")
        out[tmpl.id] = tmpl
    return out


def load_catalog(
    data_dir: Path = DEFAULT_DATA_DIR,
) -> tuple[dict[str, FieldNode], dict[str, Template]]:
    fields = load_fields(data_dir)
    templates = load_templates(data_dir)
    for t in templates.values():
        if t.field_id not in fields:
            raise ValueError(f"template {t.id}: unknown field_id '{t.field_id}'")
    return fields, templates
