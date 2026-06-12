# G1: テンプレート共有ヘルパー層の新設とボイラープレート根絶

対応アイデア: I-001〜I-012（[ideas-100.md](../ideas-100.md)）
Wave: 1（G2〜G5 と並列実行）

## 目的（根本原因R2）

`lib/engine/templates/` の約110ファイルが同一のユーティリティ（`pick()` が82ファイルに重複定義）、
choices 組み立て、generate/generateFrom 委譲をコピペしている。共有ヘルパー層を新設して重複を根絶し、
新規テンプレート作成の標準形（ファクトリ）を確立する。

## 所有ファイル（これ以外は編集禁止）

- `lib/engine/templates/**`（types.ts, index.ts, 全テンプレート、新設ファイル）
- `lib/engine/clean.ts`
- 新規テストの**追加のみ**: `tests/engine/template-helpers.test.ts`（既存テストの変更は禁止）

## 他タスクとの契約（並列タスクが依存する公開API）

- `lib/engine/clean.ts` に `export const ANSWER_EPSILON = 1e-6;` を追加すること（G2 の validate.ts が import する）。
- 既存 export（`isCleanAnswer`, `formatKW`, `formatClean`, 各テンプレートの named export, `templates/index.ts` のレジストリ）は
  シグネチャ・名前とも不変。追加のみ可。
- `lib/engine/templates/types.ts` の `Template`/`GenerationResult` インターフェースは**変更しない**（JSDoc 追記のみ可）。

## 実装項目

1. **`lib/engine/templates/helpers.ts` を新設**（I-001〜I-004, I-010）:
   - `pick<T>(arr, rng): T` — 空配列で明示的に `throw new Error("pick: empty array")`（I-002）。
   - `pickPair` 等が複数ファイルにあれば同様に集約（実態を grep で確認して判断）。
   - `buildChoices(correctText, distractorTexts): string[]` — 数値昇順（数値化できない場合は辞書順）・重複排除・正解含有を保証（I-003）。
     ※既存テンプレートの choices 並び順仕様を変えないこと。移行はロジックが完全一致するテンプレートのみ。
   - `percentage(numerator, denominator): number`（I-004）。
   - `ensureRange(value, [min, max]): boolean`（I-010、追加的ヘルパー。既存テンプレートへの一括適用はしない）。
2. **全テンプレートのローカル `pick()` を helpers.ts の import に置換**（82ファイル、機械的・挙動不変）。
3. **`isCleanAnswer` の数値安定化**（I-007）: `Math.round(value*scale)/scale` と元値の差分比較の形に整理。
   `ANSWER_EPSILON` を export し、テンプレート2件（capacitor-energy, sag-tension）のハードコード 1e-6 を import に置換（I-006）。
4. **`defineTemplate()` ファクトリを helpers.ts に追加**（I-009）:
   `{ topic, subject, exam, difficulty, paramSpecs, paramOrder, draw(rng), buildFrom(params) }` から
   `Template`（generate/generateFrom 委譲込み）を組み立てる。**代表テンプレート15件以上**
   （demand-factor, load-factor, diversity-factor 等の単純系から選ぶ）をファクトリ利用へ移行し、
   ファイル冒頭コメントで「新規テンプレートはこの形を標準とする」と明記。全数移行はしない（リスク管理）。
5. **`readonly`/`as const` 徹底**（I-008）: テンプレート内の定数配列で漏れているものを修正。
6. **JSDoc**（I-005, I-012): `clean.ts` の3整形関数の使い分け、`types.ts` の null 契約・generateFrom 再現契約を明文化。
7. **テスト新設**（I-011）: `tests/engine/template-helpers.test.ts` に pick（空配列 throw 含む）/buildChoices/percentage/
   ensureRange/ANSWER_EPSILON/isCleanAnswer 境界のテストを書く。

## 受け入れ基準

- `npx vitest run tests/engine` 全グリーン（既存テストは無変更のまま）。
- **`npm run build:problems` 実行後 `git diff --exit-code web/problems.json` が差分ゼロ**
  （生成は seeded で決定論的。これがリファクタの挙動不変の証明）。確認後、web/problems.json への変更は残さないこと。
- `grep -rln "^function pick" lib/engine/templates` が 0 件。
- `npx biome check lib/engine/templates lib/engine/clean.ts` がエラーなし。
- `npx tsc --noEmit` がエラーなし。
