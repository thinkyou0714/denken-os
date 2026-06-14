# RG2: エンジン型表現力・検証深化・観測性

対応: II-113〜II-123（[ideas-round2.md](../ideas-round2.md)） / Wave 1

## 目的（根本原因RR2/RR3）

型がドメイン不変条件を表現できておらず（source citationの条件必須等）、生成歩留まり・narrateフォールバック率が
不可視。型を強化し、検証を深め、観測フックを入れる。**生成される問題・既存挙動は不変。**

## 所有ファイル（これ以外は編集禁止）

- `lib/engine/generate.ts`, `lib/engine/validate.ts`, `lib/engine/narrate.ts`, `lib/engine/schema.ts`, `lib/engine/gate.ts`, `lib/engine/index.ts`
- 新規テスト追加のみ: `tests/engine/validate-physics.test.ts`（既存テスト変更禁止）

## 他タスクとの契約

- `lib/engine/templates/**`（RG1）, `lib/engine/cli.ts`/`figures`/`xpost`（RG3）は編集禁止。
- `schema.ts`の型変更は**後方互換な追加/絞り込みのみ**。`Problem`型をimportする全タスク（RG1/RG4/RG5/RG6）を壊さない。
  discriminated unionは既存の`{type, citation?}`を受理し続ける形にすること（型の絞り込みで既存データが弾かれないか
  `npm run validate:data`と既存テストで確認）。
- 既存exportシグネチャは不変（追加のみ）。

## 実装項目

1. **source discriminated union**（II-113）: `sourceSchema`を
   `original`枝（citation不要）と`past_exam_*`枝（citation必須）の判別共用体に。既存のrefine相当の不変条件を
   型レベルでも表現。**既存の有効データ52件＋web/problems.jsonが引き続き通ること**。
2. **validatePhysics**（II-114）: `generateOne`で`validateProblem`後に、テンプレの`physicallyValid`と
   `problem.validation.physically_valid`の一致を確認するチェックを追加（不一致は破棄＋理由）。
3. **validateProblemSet**（II-115）: 問題セット全体で同一topic内の酷似params（実質重複）を検出する
   `validateProblemSet(problems): ValidationIssue[]`を新設（純関数・既存generateには組み込まず提供のみ）。
4. **narrateテレメトリ**（II-117）: `narrate.ts`にフォールバック発生（パース失敗→default使用）を記録する
   軽量フック（コールバックinjection or カウンタ）。既定はno-op。フォールバック率/原因/モデルを取得可能に。
5. **generate歩留まり可視化**（II-118）: `generateOne`が`attemptsUsed`を返す（戻り型を後方互換に拡張、
   または別関数）。`generate`で累積棄却率をオプションのロガーに出せるように。
6. **rejection_reason**（II-119）: `validationSchema`に`rejection_reason?: string`を追加（optional・後方互換）。
7. **minConfidence/モデルのJSDoc**（II-120/II-122）: 既定値と推奨運用、`DEFAULT_NARRATE_MODEL`選択理由を明記。
8. **params逆写像バリデータ**（II-121）: GenerationResult.params → Problem.params の整合を確認する
   ヘルパーを提供（テンプレ拡張時の同期崩れ検出。generateで利用 or 検証関数として公開）。

## 受け入れ基準

- `npx vitest run tests/engine` 全グリーン（既存無変更）＋ `npm run validate:data` グリーン。
- `npm run build:problems` 後 `git diff --exit-code web/problems.json` 差分ゼロ（確認後変更を残さない）。
- `npx biome check lib/engine/generate.ts lib/engine/validate.ts lib/engine/narrate.ts lib/engine/schema.ts lib/engine/gate.ts lib/engine/index.ts` エラーなし。
- `npx tsc --noEmit` がRG2所有ファイル起因のエラーなし。
</content>
