# プロジェクト規約

## リサーチの記録
- **調査・リサーチを行ったら、その結果をそのまま `docs/` 配下に Markdown でコミットする。**
  後から判断の根拠を辿れるようにするため。出典 URL も併記する。
- 既存の調査記録: `docs/ideas.md`

## 画像/図の方針（重要）
- 技術図（回路・単線図・フェーザ・波形・ボード線図）は **コード生成（schemdraw/matplotlib）で
  solver 値から決定論的に描く**。数値が命なので AI 画像生成（gpt-image 系）は使わない。
- AI 画像生成は挿絵・章扉など `role: decorative` の非技術用途に限定（実装は保留）。
- 詳細は `docs/ideas.md` の「画像生成の境界に関する設計判断」を参照。

## 品質保証の原則
- 計算問題の答えは **SymPy solver が確定**。LLM に計算させない（文章整形のみ）。
- 生成物は必ず `denken check` / `pytest` で検証してからコミットする。
- 数値は単一ソース（solver 値）から生成し、図・本文・解答の整合を保つ。

## 開発
- Lint: `ruff check src tests` / Test: `pytest -q` / 全テンプレ検証: `denken check`
- ブランチ: `claude/sharp-mayer-OMnvZ`（PR #2）。push でこの PR が更新される。
