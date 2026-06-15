# ADR 0002: 型表現力の強化・観測フック・キャッシュ戦略

**日付**: 2026-06-15
**ステータス**: 採択
**関連 ideas**: II-113〜II-122（RG2）、II-143〜II-145（RG5）
**関連 PR**: #36

---

## Context（背景と問題）

第2ラウンドのコードベース監査（`docs/refactoring/round2/ideas-round2.md`）で
次の3つの構造的問題が根本原因として識別された。

### 問題 A: 型がドメイン不変条件を表現していない（II-113）

`engine/schema.ts` の `source` フィールドは `type` の値によって
`citation` の必須性が変わるが、これを `z.refine()` の実行時検証でのみ担保していた。

```ts
// 改善前（概念）: citationが常にoptional → IDEで見つけられない
source: z.object({ type: z.enum([...]), citation: z.string().optional() })
```

`source.type` が `"original"` 以外（`"pastexam"` / `"adapted"`）のときに
`citation` が欠落しても、コンパイル時・IDE ではエラーにならなかった。

### 問題 B: 観測性の欠如（II-117/118）

- `generateOne` の棄却回数（draw 失敗回数）が不可視で、歩留まりの劣化に気付けなかった。
- `narrate` のフォールバック率（API 失敗→スタブ切替）が記録されず、
  本番の品質劣化を事後的にしか検知できなかった。

### 問題 C: 毎描画の O(n) 集計（II-143〜145）

Web アプリの `dashboard.ts`・`xp.ts`・`achievements.ts` は描画のたびに
解答ログ全件（上限5000）を走査して集計していた。
ログが増えるほど描画が重くなるが、これがパフォーマンス問題として顕在化していなかった。

---

## Decision（決定内容）

### A. source を discriminated union で型化する

`lib/engine/schema.ts` の `source` を `z.union` + 個別スキーマで型化し、
`type!=="original"` 時に `citation` が型レベルで必須になるようにする。

```ts
// 採用後（概念）: typeに応じてcitationの必須性を型で保証
const sourceOriginal = z.object({ type: z.literal("original") });
const sourceWithCitation = z.object({
  type: z.enum(["pastexam", "adapted"]),
  citation: z.string().min(1),
});
export const sourceSchema = z.union([sourceOriginal, sourceWithCitation]);
```

`z.discriminatedUnion` ではなく `z.union` を採用した理由:
- `discriminatedUnion` は discriminant キーが `z.literal` でないと機能しない場合がある。
- エラーパス・既存の `refine` 相当の動作を維持するため、`z.union` + 個別スキーマが適切。
- **後方互換性**: `z.infer<typeof sourceSchema>` の型は従来より厳格になるが、
  コードベース内の既存 source オブジェクトはすべて `citation` を持つか `type="original"` のため
  実行時に壊れない。

### B. 観測フックを追加する（attemptsUsed / telemetry / rejection_reason）

1. **`generateOneDetailed`**: `attemptsUsed`（draw 試行回数）と
   `rejectionReason`（棄却した理由: `"draw_failed"` / `"narrate_failed"` / `"physics_mismatch"` 等）を返す。
   既存の `generateOne` シグネチャは維持し後方互換を保つ。

2. **`narrate` の `telemetry` フック**: `options.telemetry?: (info) => void` を追加する。
   フックを登録しなければ従来どおり動作し、登録した場合はフォールバック率・モデル名・
   所要時間などを受け取れる。フックの具体実装はアプリケーション側の責務とし、
   ライブラリコアに記録ロジックを持ち込まない。

3. **`validation.rejection_reason?`**: 問題スキーマの `validation` に `rejection_reason` を追加する。
   `human_checked=false` のとき何を根拠にしたか（物理的成立判定失敗・clean check 失敗等）を記録できる。

### C. 差分更新キャッシュ戦略

描画のたびに全件走査するのではなく、**ログ追記時のみ差分再計算**するキャッシュを導入する。

| 関数 | キャッシュ戦略 | 無効化条件 |
|------|--------------|-----------|
| `xpByDayCached()` (`web/src/xp.ts`) | ログ配列の参照 + 長さで比較 | ログが追加されたとき |
| `byTopicCached()` (`web/src/dashboard.ts`) | ログ配列の参照 + 長さで比較 | ログが追加されたとき |
| `evaluateAchievementsCached()` (`web/src/achievements.ts`) | ログ配列の参照 + 長さで比較 | ログが追加されたとき |

**キャッシュの永続化はしない**（localStorage への保存は行わない）。
セッション内のメモリキャッシュのみで、リロードすると再計算される。
理由: ログは常に追記のみ（削除なし・変更なし）のため、長さ比較による無効化が安全。

---

## Alternatives（検討した代替案）

### A の代替案: refine のみで維持する

- 却下理由: IDE（VS Code 等）が静的解析で `citation` 欠落を検出できない。
  型を強化することで Pull Request のレビュー負荷を下げられる。

### B の代替案: 外部ロガー（winston 等）を導入する

- 却下理由: lib/ は外部依存を最小化する方針（I-051 参照）。
  `telemetry` フックによりアプリケーション側で任意のロガーに繋げられる。

### C の代替案: Web Worker / IndexedDB で集計をバックグラウンド化する

- 却下理由: 実装コストが高く、PWA のオフライン堅持・シンプルなアーキテクチャ方針と相性が悪い。
  LOG_CAP=5000 の上限制御で集計コストは許容内に収まる。
  メモリキャッシュで十分なパフォーマンス改善が得られる。

---

## Consequences（結果と影響）

**プラス面**:

- `source.citation` の欠落が型レベルで検出可能になり、`ingest.ts` 等での過去問取込ミスが
  コンパイル時に発覚する。
- `attemptsUsed`・`rejectionReason` により、テンプレートの歩留まり劣化を数値で把握できる。
- 差分キャッシュにより、ログが5000件になっても描画コストが O(1)（差分計算なし時）になる。

**マイナス面・リスク**:

- `sourceSchema` の型が変わるため、`type!=="original"` かつ `citation` が無いオブジェクトを
  直接構築しているコードはコンパイルエラーになる（移行時の一時的なコスト）。
- `telemetry` フックは任意なため、登録しなければ観測性が上がらない。
  将来的には `scripts/build-problems.ts` 等に標準フックを配線することが望ましい。

**変更しないもの**:

- 生成問題データ (`web/problems.json`) のバイト列は本 ADR の影響を受けない。
- `generateOne`（後方互換シグネチャ）・`validateProblem`・既存のエクスポートは変わらない。
- localStorage キー・Supabase テーブル構造・保存データ形式は変わらない。

---

## 関連ドキュメント

- [`docs/adr/0001-dual-schema-validation.md`](./0001-dual-schema-validation.md) — 二重スキーマ検証の設計判断
- [`docs/refactoring/round2/ideas-round2.md`](../refactoring/round2/ideas-round2.md) — 第2ラウンドのアイデアカタログ（II-113〜II-145）
- [`docs/architecture.md`](../architecture.md) — モジュール依存グラフと実行フロー
