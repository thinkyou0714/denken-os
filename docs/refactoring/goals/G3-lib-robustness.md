# G3: lib 非エンジン領域の堅牢化と共有定数の一元化

対応アイデア: I-021〜I-033（[ideas-100.md](../ideas-100.md)）
Wave: 1（G1/G2/G4/G5 と並列実行）

## 目的（根本原因R3/R4）

時間定数・乱数などの基盤コードの重複を `lib/shared/` に一元化し、
ストア層の「黙って握りつぶす/無検証キャスト」を検知可能・検証済みに改める。

## 所有ファイル（これ以外は編集禁止）

- `lib/scheduler/**`, `lib/store/**`, `lib/chat/**`, `lib/aggregate/**`, `lib/analytics/**`,
  `lib/audit/**`, `lib/clients/**`, `lib/community/**`, `lib/correction/**`, `lib/crosspost/**`,
  `lib/export/**`, `lib/ingest/**`, `lib/notify/**`, `lib/share-card/**`
- 新規: `lib/shared/time.ts`, `lib/shared/rng.ts`
- `types/node-lite.d.ts`（コメント追記のみ）
- 新規テストの**追加のみ**: `tests/shared/*.test.ts`（既存テストの変更は禁止）

## 他タスクとの契約（重要・他waveが依存）

- `lib/shared/time.ts` は最低限 `export const DAY_MS = 86_400_000;` と
  `export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;`（JSDoc 付き）を提供すること。
- `lib/shared/rng.ts` は `scripts/build-problems.ts` の xorshift 実装と**同一アルゴリズム・同一出力**の
  `export function seededRng(seed: number): () => number` を提供すること（G5 が scripts から、G7 が tests から import する。
  出力が変わると生成 problems.json が変わるため、ビット単位で同一であること）。
- 既存 export のシグネチャ不変（追加のみ可）。既存テスト無変更でグリーン。
- `web/src/**` は G4/G6 の所有。lib 側の DAY_MS 重複だけを対象とする。

## 実装項目

1. **時間定数の一元化**（I-021）: `lib/shared/time.ts` 新設。`lib/scheduler/types.ts` の `DAY_MS` は
   `lib/shared/time.ts` からの re-export に変え（後方互換維持）、`lib/notify/schedule.ts` と
   `lib/scheduler/diagnosis.ts` の `86_400_000` 直書きを import に置換。
2. **seeded RNG の共有化**（I-033）: `scripts/build-problems.ts` 内の xorshift をそのまま `lib/shared/rng.ts` へ
   コピーして export（scripts 側の置換は G5 が行うので scripts は触らない）。`tests/shared/rng.test.ts` で
   既知 seed の先頭数値列をスナップショット（G5 移行後の同一性保証の基準になる）。
3. **supabase-store の検証付きマッピング**（I-022）: 行→`Problem` 変換を `problemSchema.parse`（zod）ベースに変更。
   行→AnswerLog 等も最小の zod スキーマで検証。パース失敗時は「どのテーブルのどの id か」を含むエラー。
4. **supabase-store のエラーラッパ**（I-023〜I-024）: `fail(op: string, error)` 的内部ヘルパーで
   `"problems.upsert failed: <message>"` 形式に統一。`createSupabaseStores` に url/key の空チェック追加。
5. **file-store の破損検知**（I-025）: `readJson` で `SyntaxError`（JSON破損）の場合のみ
   `console.warn`（ファイルパス付き）してから fallback を返す。ENOENT 等は従来どおり無音で fallback。
6. **aggregate の不一致警告**（I-026）: votes/choices の長さ不一致時に `console.warn`。戻り値挙動は不変。
7. **コメント/JSDoc 整備**（I-027〜I-032）:
   - sm2.ts: ease 上限なしが標準 SM-2 準拠である旨。
   - chat/knowledge.ts: 科目別セクションの目次コメント（コード分割はしない）。
   - store/index.ts: Store インターフェースの契約 JSDoc。
   - notify/schedule.ts: 試験日当日・過去日の境界挙動。
   - types/node-lite.d.ts: 存在理由（@types/node 全面導入を避ける方針）を冒頭に。
   - clients/x-client.ts: タイムアウト/リトライの方針コメントとマジックナンバーの定数化。

## 受け入れ基準

- `npx vitest run tests/scheduler tests/store tests/chat tests/aggregate tests/analytics tests/audit tests/clients tests/community tests/notify tests/export tests/ingest tests/misc tests/infra tests/shared` 全グリーン（既存テスト無変更）。
- `npx biome check lib/scheduler lib/store lib/chat lib/aggregate lib/analytics lib/audit lib/clients lib/community lib/correction lib/crosspost lib/export lib/ingest lib/notify lib/share-card lib/shared` エラーなし。
- `npx tsc --noEmit` エラーなし。
- supabase-store のテスト（tests/store/supabase-*.test.ts）が無変更でグリーン
  （= zod 検証導入が正常系の挙動を変えていない証明）。
