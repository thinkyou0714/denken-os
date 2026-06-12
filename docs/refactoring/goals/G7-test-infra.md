# G7: テスト基盤の共通化とエッジケース補強

対応アイデア: I-027, I-063〜I-074（[ideas-100.md](../ideas-100.md)）
Wave: 2（G6 と並列。G1〜G5 完了済みの状態から開始）

## 目的

8ファイルに重複する `MemoryStorage`、6ファイルに重複する seeded RNG を共有ヘルパーへ根絶し、
「二重スキーマのドリフト」「テンプレートの再現性」という構造リスクをテストで封じる。

## 所有ファイル（これ以外は編集禁止）

- `tests/**`（既存テストの整理・新規テスト追加）
- `vitest.config.ts`
- 新規: `tests/helpers/storage.ts`, `tests/helpers/rng.ts`, `tests/helpers/fixtures.ts`
- `lib/**`, `web/**`, `scripts/**` は編集禁止（テスト対象の変更は不可。バグを見つけたら
  テストに `// TODO(audit):` コメントを残して報告する）。

## 他タスクとの契約

- `tests/helpers/rng.ts` は `lib/shared/rng.ts`（G3 新設）を re-export する薄いラッパとし、
  既存テストの seed 値・期待値は**変えない**（同一アルゴリズム保証済み）。
- 既存テストのリファクタは「ヘルパー抽出による置換」のみ。アサーションの意味を弱めない。

## 実装項目

1. **`tests/helpers/storage.ts`**（I-063, I-065）: `MemoryStorage`（StorageLike 実装）と
   `ThrowingStorage`（setItem が throw）を export。重複定義している全テストファイル
   （tests/web/backup, chat, plan-settings, quality ほか grep で全件特定）を置換。
2. **`tests/helpers/rng.ts`**（I-064）: `seededRng` を提供し、tests/web/exam, tests/engine/generate,
   templates, template-invariants, xpost/publish, subject-coverage 等の重複を置換。
3. **`tests/helpers/fixtures.ts`**（I-066）: `fixturePath(...segments)` と `loadProblemFixture(id)` を提供、
   `data/problems/...` への直書きパスを置換。
4. **テンプレート再現性プロパティテスト**（I-067）: 新規 `tests/engine/generate-from-roundtrip.test.ts`。
   全テンプレートについて seeded rng で `generate()` を成功するまで（上限付きで）試行し、
   得た `result.params` の数値を `generateFrom()` に渡して `answerText`/`answerValue`/`choices`/`format` が
   一致することを検証。不一致のテンプレートが見つかった場合はコード修正せず、明示的な
   `KNOWN_DIVERGENT` 許容リスト＋`// TODO(audit):` で記録（ゼロ件が理想）。
5. **isCleanAnswer スケール回帰**（I-068）: 新規テストで 0.01〜10^6 スケールの代表値の受理/拒否を固定。
6. **二重スキーマのドリフト検知**（I-069）: 新規 `tests/engine/schema-drift.test.ts`。
   `data/problems/*.json` 全件を ajv（problem-schema.json, validate-problems.ts と同条件）と
   zod（problemSchema）の両方で検証し、**判定が一致**することを確認。
7. **スクリプト失敗系**（I-070）: G5 が export した純関数に対し、不正 JSON・スキーマ違反・空集合の
   ケースをテスト（新規 tests/scripts/*.test.ts。tsconfig の include に tests は含まれている）。
8. **時刻依存の安定化**（I-071）: `Date.now()` に依存して日境界をまたぐと壊れ得るテストを特定し、
   `vi.useFakeTimers()`/`vi.setSystemTime()` か明示的な nowMs 引数渡しへ（既存の意味は不変）。
9. **SM-2 ease 上限なしの保証**（I-027）: easy 連打で ease が単調増加しても interval が有限である等の
   性質テストを tests/scheduler/sm2.test.ts に**追加**（既存ケースは不変）。
10. **弱アサーション強化**（I-074）: tests/engine/new-templates.test.ts 等に物理不変条件
    （効率 0<η≦1、電力>0、力率≦1 など該当するもの）の追加アサーション。既存の厳密一致は残す。
11. **新設ヘルパーのテスト補完**（I-072）: G3 の lib/shared/time・supabase 検証マッピング、
    G4 の dates/sanitize で、G1〜G5 がテストを書いていない公開関数を補完（重複させない。既存があれば不要）。
12. **カバレッジ閾値**（I-073）: `npm run test:coverage` を実測し、現行床（85/76/92/89）より実測が
    十分高ければ床を実測-3pt 程度まで引き上げ。下げるのは禁止。

## 受け入れ基準

- `npm test` 全グリーン、テスト数は現状（604）から**増加**していること。
- `grep -rln "class MemoryStorage" tests | wc -l` が 1（helpers のみ）。
- `grep -rln "function seededRng\|xorshift" tests --include="*.test.ts" | wc -l` が 0（helpers 経由のみ）。
- `npm run test:coverage` が閾値を満たす。
- `npx biome check tests vitest.config.ts` エラーなし。`npx tsc --noEmit` エラーなし。
