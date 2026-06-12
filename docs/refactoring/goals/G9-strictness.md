# G9: 設定厳格化と全体整合（最終仕上げ）

対応アイデア: I-093, I-094（[ideas-100.md](../ideas-100.md)）
Wave: 3（G8 と並列実行可。コード変更がすべて完了した状態から開始）

## 目的（根本原因R5）

G1〜G7 で土台が整った状態で、緩めてあった lint/型設定を締め、リポジトリ全体を新しい基準に整合させる。
（例: 82箇所あった `pick()` の非null断言は G1 で根絶済みのため、`noNonNullAssertion` を現実的なコストで有効化できる。）

## 所有ファイル

- `tsconfig.json`, `web/tsconfig.json`, `biome.json`
- 違反修正のためであれば `lib/**`, `web/src/**`, `scripts/**`, `tests/**` の**最小限の修正**を行ってよい
  （Wave 3 は単独実行のため所有権競合はない）。ロジック変更は禁止 — 型注釈・ガード・unknown化・
  個別 `biome-ignore` コメント（理由必須）のみ。

## 実装項目

1. **biome.json**（I-094）:
   - `noExplicitAny: "off"` を削除（recommended の既定 = error 相当へ）。違反を全修正
     （`unknown`＋絞り込み、正確な型付け。テストの意図的な any は `biome-ignore lint/suspicious/noExplicitAny: <理由>`）。
   - `noNonNullAssertion: "off"` を削除。違反は ガード/`?? フォールバック`/明示 throw で置換。
     どうしても合理的な箇所（直前で存在保証済み等）は個別 ignore＋理由。
2. **tsconfig.json / web/tsconfig.json**（I-093）:
   - `noImplicitReturns: true`, `noFallthroughCasesInSwitch: true` を追加し、違反修正。
   - `exactOptionalPropertyTypes: true` を**試行**: エラーが30件以下なら修正して採用、
     超えるなら不採用とし tsconfig にコメントで「2026-06 時点で影響大（N件）のため見送り」と記録。
   - web/tsconfig.json が root を extends しているか確認し、重複設定があれば extends + 差分のみに整理
     （コンパイル結果が変わらないこと）。
3. **最終整合**: `npm run verify` と `npm run test:coverage` と `npm run audit:status:strict` を実行し全グリーン。
   `npm run build:problems` 後の `git diff --exit-code web/problems.json` 差分ゼロも最終確認（確認後、変更は残さない）。

## 受け入れ基準

- `npm run lint` がルール強化後もエラーなし（ignoreコメントには全件理由が付いている）。
- `npm run verify` / `npm run audit:status:strict` 全グリーン。
- `git diff` に意図しない生成物（web/problems.json, web/dist）の変更が含まれない。
- biome.json から `"off"` の上書きが消えている（または残す場合は根拠コメント付き）。
