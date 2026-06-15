# RG1: テンプレート物理制約の一元化と defineTemplate 全移行

対応: II-101〜II-112（[ideas-round2.md](../ideas-round2.md)） / Wave 1

## 目的（根本原因RR1）

`defineTemplate`採用が13/87止まりで、残り74テンプレが手書き`generate`/`generateFrom`委譲のまま。
物理制約チェック（効率≤1・力率≤1・ゼロ割・負値）が各テンプレに散在している。
共有制約ヘルパーを新設し、全テンプレをファクトリ形式へ移行する。**生成される問題は1バイトも変えない。**

## 所有ファイル（これ以外は編集禁止）

- `lib/engine/templates/**`（91ファイル＋types.ts/helpers.ts/index.ts）
- `lib/engine/clean.ts`
- 新規 `lib/shared/constants.ts`
- 新規テスト追加のみ: `tests/engine/templates-physics.test.ts`（既存テスト変更禁止）

## 他タスクとの契約

- `lib/shared/constants.ts` は最低限 `export const POWER_FACTOR_TOLERANCE = 1e-9;` を提供（他タスクが参照しうる）。
- `lib/engine/templates/types.ts` の `ParamSpec`/`Distractor`/`Template` 既存フィールドは壊さない（追加のみ）。
- `lib/engine/schema.ts`（RG2所有）は編集禁止。Subject/Exam型はimportのみ。

## 実装項目

1. **constrainRange等の共有制約ヘルパー**（II-102〜II-105）を `templates/helpers.ts` に追加:
   - `constrainRange(value, min, max, name?): boolean`（境界含む。II-102）
   - `isNonNegative(value): boolean` と負値ガード（II-105）
   - `percentage`のゼロ割は既存通りNaN返却だが、JSDocで「呼び出し側は`Number.isNaN`で棄却」を明記し、
     代表テンプレで実際にガードを入れる（II-104）。
   - `POWER_FACTOR_TOLERANCE` は `lib/shared/constants.ts` から re-export して使用（II-103）。
2. **defineTemplate 全移行**（II-101）: 手書き委譲の74テンプレを `defineTemplate<Params>({...})` 形式へ機械的に移行。
   - `draw(rng)`でparams抽選、`buildFrom(params)`で計算、generate/generateFromの委譲はファクトリに任せる。
   - **挙動不変**: 計算式・選択肢順序・文字列を一切変えないこと。移行はロジック等価変換のみ。
   - 移行が困難な特殊テンプレ（複数戻り値形式・非標準draw）は無理に移行せず、報告に列挙。
3. **ParamSpecにrequired**（II-110）: `ParamSpec`に`required?: boolean`を追加（既定はrequired扱い）。
   defineTemplateのgenerateFromで`paramOrder`の全キー存在チェックは既存通り維持。型と整合させる。
4. **Distractor拡張**（II-109/II-123）: `Distractor`に`reason`必須化（既存は既にreasonあり）＋
   optional予約フィールド`frequency?: number`/`sourceRef?: string`を追加（後方互換）。
5. **buildChoices統一**（II-107）: 独自sortを持つテンプレでロジックがbuildChoicesと完全一致するものを統一。
   一致しないものは触らず報告。
6. **readonly徹底**（II-108）＋**整形JSDoc**（II-106）: `formatClean`/`formatKW`の使い分けをclean.tsのJSDocに明記。
7. **定型JSDoc**（II-112）: 移行したテンプレ＋代表20件の冒頭に【出題シナリオ/正解導出式/既定params/境界】を付与。
8. **テスト**（II-102〜105のヘルパー）: `tests/engine/templates-physics.test.ts` に constrainRange/負値ガード/
   POWER_FACTOR_TOLERANCE の境界テストを追加。

## 受け入れ基準

- `npx vitest run tests/engine` 全グリーン（既存テスト無変更）。
- **`npm run build:problems` 後 `git diff --exit-code web/problems.json` 差分ゼロ**（最重要・挙動不変の証明）。
  確認後 web/problems.json への変更は残さない。
- `grep -rl 'generateFrom(params)' lib/engine/templates/*.ts | wc -l` が大幅減（特殊例外のみ残す。残数を報告）。
- `npx biome check lib/engine/templates lib/engine/clean.ts lib/shared/constants.ts` エラーなし。
- `npx tsc --noEmit` がRG1所有ファイル起因のエラーなし。
</content>
