# G6: app.ts モノリス分割（ui / views / state）

対応アイデア: I-053〜I-062, I-034/I-035/I-037 のUI側適用（[ideas-100.md](../ideas-100.md)）
Wave: 2（G7 と並列。G1〜G5 完了済みの状態から開始）

## 目的（根本原因R1 — 本リファクタの最重要タスク）

2,570行の `web/src/app.ts` に7画面の描画・状態・ルーティング・採点・タイマー・起動処理が同居している。
これを責務単位のモジュールへ分割する。**外部挙動（DOM構造・文言・イベントフロー・保存データ）は一切変えない。**

## 所有ファイル（これ以外は編集禁止）

- `web/src/app.ts`（エントリポイントとして残す。目標 ≤150行）
- 新規ディレクトリ: `web/src/ui/**`, `web/src/views/**`, `web/src/state/**`
- 既存テストの変更は禁止（tests/web は app.ts を import していないので影響しないはず）。

## 他タスクとの契約

- G4 が Wave 1 で用意済みの以下を**利用する**（再実装しない）:
  - `web/src/dates.ts` の `sameJstDay`/`dayIndex`（app.ts 内のローカル `sameJstDay` を置換, I-034）
  - `web/src/sanitize.ts` の `sanitizeSvg`（`figureNode` で適用, I-037）
  - `LocalProgress.lastPersistError`（採点記録後にチェックし、失敗していたら
    「⚠️ 保存に失敗しました。空き容量を確認してください」トーストを一度だけ表示, I-035）
- `web/src/*.ts` の既存モジュール（store/xp/quests/…）と `web/index.html`・`web/sw.js`・`scripts/build-web.ts` は編集禁止。
  esbuild のエントリは `web/src/app.ts` のまま変えない。
- SW の CACHE 版数は G4 が v19 に上げ済み。触らない。

## 分割の設計（現 app.ts の行番号 → 新モジュール）

```
web/src/ui/dom.ts        h(), Attrs/Children 型, $() 等の DOM ヘルパー (現110-127付近)
web/src/ui/widgets.ts    difficultyStars, sourceText, solutionNode, figureNode, emptyState,
                         sparklineNode, ringNode, bar, masteryChip (現255-320, 1746-1762)
web/src/ui/toast.ts      showToast 系（既存実装を移設）
web/src/state/app.ts     problems 配列, loadFailed, 現在view, progress(LocalProgress)インスタンス,
                         applyTheme, テーマ/ネット状態 (現129-163)
web/src/state/practice.ts practice オブジェクト・combo・hints 等 (現143-159付近) と
                         practicePool/weakTopics/todayCount
web/src/state/exam.ts    ExamState 型と exam 状態, endExam, startExam, timeoutExam, startTimer
                         (現165-200, 1264-1418)
web/src/views/router.ts  TABS 定義, renderHeader, updateNetStatus, renderNav, switchView,
                         render, renderErrorBoundary (現323-440)
web/src/views/practice.ts 学習タブ: onboardingCard, mascotCard, questsCard, weeklyQuestsCard,
                         sessionSummaryCard, renderPractice, nextQuestion, renderAnswerInputs,
                         gradeObjective, revealDescriptive, ratingBar (現442-1098)
web/src/views/practice-rewards.ts processRewards, RewardOutcome, finalize の報酬計算部 (現908-1098)
web/src/views/review.ts  復習タブ (現1100-1212)
web/src/views/exam.ts    模試タブの描画: renderExam, renderExamRunning, renderExamResult (現1214-1546)
web/src/views/chat.ts    質問タブ (現1548-1741)
web/src/views/dashboard.ts 進捗タブ: renderDashboard をセクション関数
                         (levelCard/todaySection/xpChart/masterySection/statsSection/badgesSection)
                         に分解して移設 (現1743-2064, I-054)
web/src/views/formulas.ts 公式タブ (現2066-2120)
web/src/views/settings.ts 設定タブ (現2121-2286)
web/src/keyboard.ts      ショートカット・キーボードヘルプ (現2389-2470)
web/src/app.ts           main(), SW登録, グローバルエラーハンドラ, reloadProblems, 起動のみ
```

- 循環参照（views ↔ router）は、`router.ts` が view の render 関数を import して dispatch し、
  views 側は `switchView`/`render` を import する形で許容される（実行は遅延・esbuild/ESMで安全）。
  気になる場合は `state/app.ts` に `requestRender` コールバック登録方式（依存性逆転）を使ってよい。
  **`npm run typecheck:web` と `npm run build:web` が通ることが正**。
- 分割は「切り取り→貼り付け→import整理」を基本とし、ロジックの書き換えは下記の小修正以外しない。

## 分割と同時に入れる小修正（挙動の安全側強化のみ）

1. `renderDashboard`(281行)/`renderExamResult`(126行)/`finalize`(99行) は移設時にセクション関数へ分解（I-054）。
2. キーボードヘルプ: `aria-modal="true"`、Escape で閉じる、閉じたら呼び出し元へフォーカス返却（I-058）。
3. チャット送信に最小間隔 1000ms のガード（I-059。busy フラグは現行維持）。
4. グローバルエラートーストは 8 秒で自動消滅（I-060）。
5. `reloadProblems` で配列であること・先頭要素に id/statement/answer/solution があることの軽量検証。
   不正なら既存の読込失敗フロー（loadFailed）に乗せる（I-061）。
6. 分割で浮いた dead code（未使用変数・到達しないパス）は削除し、判断に迷うものは TODO コメント（I-062）。

## 受け入れ基準

- `wc -l web/src/app.ts` ≤ 150。新規モジュールはどれも 600 行以下（views/practice.ts が超える場合はさらに分割）。
- `npm run typecheck:web` / `npm run build:web` / `npx vitest run tests/web` すべてグリーン（既存テスト無変更）。
- `npx biome check web/src` エラーなし。
- バンドルサイズ（build:web 出力）が分割前と同等（±5%以内。G4 のサイズレポートで確認）。
- `grep -rn "function renderDashboard" web/src` 等で各画面の所在が設計表どおりであること。
