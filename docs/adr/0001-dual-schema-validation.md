# ADR 0001: 二重スキーマ検証（zod + JSON Schema/ajv）

**日付**: 2026-06  
**ステータス**: 採択  
**関連 idea**: I-099  
**ドリフト検知テスト**: `tests/engine/schema-drift.test.ts`

---

## Context（背景と問題）

DENKEN-OS の問題データ（`Problem` 型）は 2 か所で定義されている:

| 定義場所 | 技術 | 用途 |
|---|---|---|
| `lib/engine/schema.ts` | **zod** | 実行時型検証・TypeScript 型推論 |
| `docs/x-strategy/templates/problem-schema.json` | **JSON Schema draft-07 / ajv** | CI 品質ゲート・外部公開用スキーマ |

どちらか一方だけで済ませる方針も検討したが、要件が異なる:

- **zod**: TypeScript の型推論との統合が必要（`z.infer<typeof problemSchema>` で `Problem` 型を導出）。
  Node ランタイムでの逐次バリデーション・エラーメッセージの日本語化が容易。
- **ajv (JSON Schema)**: 仕様が標準化されており、CI ツール・外部レビュアー・AI ツールへの提示に適する。
  `docs/` 以下に静的ファイルとして配置でき、TypeScript ツールチェーンへの依存なしに検証できる。

この二重管理が放置されると、一方を修正してもう一方に反映し忘れる **ドリフト（乖離）** が生じる。
ドリフトが発覚しない場合、CI を通過した問題データが実行時バリデーションで失敗する
（または逆に CI でのみ落ちて原因が不明瞭になる）。

---

## Decision（決定内容）

**二重定義を維持しつつ、ドリフトをテストで機械的に検知する。**

1. `lib/engine/schema.ts` (zod) は **型の真の定義場所（single source of truth）** とする。
   実行時バリデーション・TypeScript 型推論・テンプレートロジックはすべてここを参照する。

2. `docs/x-strategy/templates/problem-schema.json` (ajv) は **外部公開仕様書** として維持する。
   CI の `npm run validate:data`（`scripts/validate-problems.ts`）はこちらを使用する。
   外部レビュアーや AI ツールへ提示する際は JSON Schema ファイルを渡す。

3. `tests/engine/schema-drift.test.ts`（I-069）が `data/problems/*.json` の全件を
   **ajv と zod の両方で検証し、合否が一致すること**を毎 CI で確認する。
   一方のみ通過するデータファイルがあれば即座にテストが落ちる（ドリフト検知）。

---

## Alternatives（検討した代替案）

### A. zod-to-json-schema などのライブラリで自動生成する

- 利点: 定義が 1 か所になる。
- 却下理由: `problem-schema.json` には `$comment` で人間向けの運用注釈（過去問著作権・複合制約）が
  含まれており、自動生成ではこれが失われる。また外部依存の追加を避ける方針（I-051 参照）。

### B. ajv のみに統一する（zod を削除）

- 利点: 定義が 1 か所になる。
- 却下理由: TypeScript の型推論（`z.infer`）が使えなくなる。
  実行時の型安全が `as` キャストに退化し、根本原因 R4（無検証キャスト）が再発する。

### C. zod のみに統一する（JSON Schema を削除）

- 利点: 定義が 1 か所になる。
- 却下理由: `scripts/validate-problems.ts` の CI ゲートに TypeScript ランタイムが必要になる。
  JSON Schema はスキーマ仕様として自己文書化されており、外部公開・レビューに適している。

---

## Consequences（結果と影響）

**プラス面**:

- `Problem` 型は zod から推論されるため、コンパイル時に型安全が保たれる。
- CI の validate:data は ajv で高速に全問題を検証できる。
- ドリフトは `schema-drift.test.ts` が毎回検知するため、人的注意に依存しない。
- 外部レビュアー・AI ツールには JSON Schema ファイルを渡すだけでスキーマを理解してもらえる。

**マイナス面・リスク**:

- スキーマを変更するときは **zod と JSON Schema の両方**を更新しなければならない。
  手順: `lib/engine/schema.ts` を変更 → `problem-schema.json` を手動追従 → `schema-drift.test.ts` がグリーンであることを確認。
- ドリフトテストは `data/problems/` の実データで判定するため、
  スキーマに追加したフィールドが全データに含まれるまで「ajv は通過するが zod が要求する」差異を見逃す可能性がある。
  → 新フィールドは `optional()`/nullable で導入し、段階的に必須化する。

**変更しないもの**:

- 生成問題データ (`data/problems/*.json`, `web/problems.json`) のバイト列は本 ADR の影響を受けない。
- 既存の保存データ形式（localStorage キー・Supabase テーブル構造）も変わらない。
