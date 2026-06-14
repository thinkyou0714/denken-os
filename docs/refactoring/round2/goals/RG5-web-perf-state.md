# RG5: Web ランタイム性能・状態永続・チャット堅牢化

対応: II-143〜II-155（[ideas-round2.md](../ideas-round2.md)） / Wave 2（Wave1完了後）

## 目的（根本原因RR4）

毎描画でO(n)集計（上限5000ログ）が走り、チャットのcleanupが不完全、quota管理が曖昧。

## 所有ファイル（これ以外は編集禁止）

- `web/src/*.ts` の **view以外すべて**（store, xp, dashboard, achievements, mascot, fx, chat, backup,
  freeze, retention, stats, select, plan, grade, format, formulas, mathfmt, errors）
- `web/src/state/**`
- 新規テスト追加のみ: `tests/web/perf-cache.test.ts`（既存テスト変更禁止）

## 他タスクとの契約

- `web/src/views/**`, `web/src/ui/**`, `web/src/app.ts`, `web/src/keyboard.ts`（RG6）は編集禁止・importのみ。
- 既存exportシグネチャは不変（追加のみ）。既存テスト（tests/web/**）無変更でグリーン。
- キャッシュ導入は**結果が非キャッシュ時と完全一致**すること（メモ化は純粋性を壊さない）。

## 実装項目

1. **xpByDayメモ化**（II-143）: Storeに差分更新キャッシュ。ログ追記時のみ更新。結果不変。
2. **byTopicキャッシュ**（II-144）＋**badgeステータスキャッシュ**（II-145）: 同様に差分更新。
3. **mascot最適化**（II-146/II-147）: 表情選択を1Dルックアップ表に、tipIndexをメモ化。出力不変。
4. **streamClaude cleanup**（II-148）: abort時に`finally`でlive node削除を明示。
5. **extractTextDelta診断**（II-149）: parse失敗時のwarn（正常系[DONE]等と区別）。
6. **チャット履歴トリム統一**（II-150）: load/append両方で`slice(-CHAT_HISTORY_MAX)`適用。
7. **quota管理**（II-151）: 使用量推定でLOG_CAPを動的調整する最小実装（or 警告）。安全側。
8. **backup段階互換**（II-152）: マイナー版互換許容/メジャー拒否。
9. **practice state保持**（II-153）: 採点途中のcombo/hintsをsession内保持（タブ切替で消さない）。
   ※state/practice.ts所有。setterの呼び出し側(views)はRG6が対応するため、ここではstate層のAPIを用意。
10. **runFreezeBridge冪等化**（II-154）: 最終実行日をstorageに保存し二重カウント防止。
11. **confetti cleanup**（II-155）: spanにanimationendで削除。
12. テスト: `tests/web/perf-cache.test.ts` でキャッシュ結果が非キャッシュと一致することを検証。

## 受け入れ基準

- `npx vitest run tests/web` 全グリーン（既存無変更）。
- `npm run typecheck:web` エラーなし。`npx biome check web/src`（自所有分）エラーなし。
- キャッシュ前後で集計結果が一致することをテストで保証。
</content>
