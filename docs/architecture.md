# アーキテクチャ

denken は「パラメトリックな問題雛形(テンプレート)から、検証済みの類題を決定論的に生成する」エンジンです。

## パイプライン

```
テンプレート(YAML) + seed
        │
        ▼
  params.sample_params      ← seed で決定論的にパラメータをサンプリング(難易度 variant 対応)
        │
        ▼
  solver.solve (SymPy)      ← 答えと全中間値を厳密計算。LLM には計算させない
        │
        ├─► figures.render_figures   ← solver 値から図を決定論的に描画(技術図はコード生成のみ)
        │
        ├─► generate._auto_steps / solution_template   ← 解答ステップ(記号→数値)
        │
        ├─► pitfalls (solver.eval_expr)               ← よくある誤りの誤答値
        │
        ▼
  llm backend.write         ← 問題文・解説を整形(stub=オフライン / ollama=構造化出力)
        │
        ▼
  Problem (pydantic)
        │
        ├─► validate         ← 再計算突合 / 妥当範囲 / 数値グラウンディング / rubric
        ├─► units.check_dimensions   ← pint で次元整合
        │
        ▼
  render.write_problem / write_index  ← Obsidian 互換 markdown + JSON + 図
```

## モジュール責務

| モジュール | 責務 |
|---|---|
| `models` | pydantic データモデル(Template / Problem / 各種 Spec)。著作権の不変条件: 構造のみ保持 |
| `catalog` | `data/fields.json` と `data/templates/*.yaml` の読み込み・整合検証 |
| `params` | seed 付き決定論サンプラ(再現性の核) |
| `solver` | SymPy による厳密計算。`I`/`Eq` 等の予約名衝突を回避する `parse_expr` |
| `figures` | 図ジェネレータの登録制レジストリ(phasor/single_line/waveform/bode/impedance_triangle/…) |
| `llm` | 差し替え可能な文章整形バックエンド(`base`/`stub`/`ollama`) |
| `generate` | 上記を束ねる純関数パイプライン + 重複排除 + best-of-N 検証 |
| `problemset` | 複数テンプレから重複なしの問題セットを構築 |
| `validate` | 計算/論説の検証 + 数値グラウンディング + 誤りの妥当性 |
| `units` | pint による次元整合検証 |
| `render` | Obsidian 互換 markdown 出力 |
| `schedule` | FSRS 復習スケジューラ |
| `extract` | PDF から分野タクソノミー(構造ラベル)のみ抽出。本文は非保持 |
| `cli` | `denken list / gen / set / validate / check` |

## 設計原則

1. **正答は solver が確定**。LLM は数値を生成・改変しない(数値グラウンディングで担保)。
2. **単一ソース**: 図・本文・解答・採点はすべて solver 値から導出され、整合する。
3. **決定論・再現性**: 同じ seed → 同じ問題。ゴールデンテストで回帰を検出。
4. **技術図はコード生成のみ**(数値正確性が命)。AI 画像生成は装飾用途に限定(`role`)。
5. **著作権ガード**: 参考書本文は取り込まない。分野の構造ラベルのみ。

詳細な設計判断・調査記録は `docs/ideas.md` を参照。
