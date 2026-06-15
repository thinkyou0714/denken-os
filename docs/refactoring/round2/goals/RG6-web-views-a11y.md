# RG6: Web ビュー・アクセシビリティ・DOM安全・タイマーライフサイクル

対応: II-156〜II-174（[ideas-round2.md](../ideas-round2.md)） / Wave 2（Wave1完了後）

## 目的（根本原因RR4/RR5）

模試タイマーのclearInterval漏れ（最重要）、aria-live欠如、`querySelector as`のnull黙殺、全体try-catchの粗さ。
**DOM構造・文言・イベントフローは原則不変**（a11y属性追加・cleanup・安全化のみ）。

## 所有ファイル（これ以外は編集禁止）

- `web/src/views/**`, `web/src/ui/**`, `web/src/keyboard.ts`, `web/src/app.ts`, `web/src/app-init.ts`
- 新規テスト追加のみ: `tests/web/views-a11y.test.ts`（既存テスト変更禁止）

## 他タスクとの契約

- `web/src/*.ts`（view以外）・`web/src/state/**`（RG5）は編集禁止・importのみ。
  RG5が`state/practice.ts`にsetter APIを用意するので、views側はそれを呼ぶ（II-153/II-174連携）。
- `web/index.html`/`web/sw.js`（RG7）は編集禁止。
- 既存テスト（tests/web/**）無変更でグリーン。

## 実装項目

1. **タイマーリーク解消**（II-156・最重要）: exam setterで「既存timerIdがあればclearInterval後に新設」。
   render層でview離脱時の一元cleanup。switchView経由以外の経路も塞ぐ。
2. **render冪等性/a11y**（II-157）: `root.innerHTML=""`→`replaceChildren()`、描画中`aria-busy`トグル。
3. **トースト消滅告知**（II-158）＋**タイマー警告通知**（II-159）: aria-live適正化、残60秒でaria-label更新＋live region。
4. **フォーカス/モーション**（II-160/II-161/II-173）: 自動focusをprefers-reduced-motionでガード、
   focus-visibleにoutline+offset併用（CSSは index.html所有のため、ここはJS側のoutline付与 or 既存class利用）。
   ※CSS追加が必要な場合はRG7に依頼事項として報告（index.htmlは触らない）。
5. **per-viewエラー境界**（II-162）: 各render*内try-catchで該当タブのみrecovery表示。親renderはルーティングに専念。
6. **renderExamResult単一パス**（II-163）: 冒頭でscoreBySubject/weakTopics/reviewItemsを1回計算しセクションへ。
7. **problems二重ロード防止**（II-164）＋**online自動リトライ**（II-165）: 既読フラグ、onlineイベントで`reloadProblems`。
8. **lastPersistError通知**（II-166）: render/main冒頭で`progress.lastPersistError`を見てトースト（一度だけ）。
9. **模試中断のtimer整合**（II-167）＋**見直し一括展開**（II-168）。
10. **DOM安全**（II-169/II-170/II-171）: `h()`のhtml経路をsanitize済みのみ許可する安全化、
    `$req(host, sel)`ガード付き取得ヘルパー（ui/dom.ts）、`exam.set.at(idx)`化。
11. **リスナcleanup**（II-172）: 削除時のリスナ残存対策（集約 or delegation）。
12. **practice setter利用**（II-174）: RG5の setter を呼ぶ形に。
13. テスト: `tests/web/views-a11y.test.ts` でタイマーcleanup・$req・per-view境界を検証。

## 受け入れ基準

- `npx vitest run tests/web` 全グリーン（既存無変更）。`npm run typecheck:web`／`npm run build:web` 成功。
- `npx biome check web/src/views web/src/ui web/src/keyboard.ts web/src/app.ts web/src/app-init.ts` エラーなし。
- タイマーリーク解消をテストで保証（view離脱でclearIntervalが呼ばれる）。
- バンドルサイズが大きく増えない（±5%以内、build:webレポートで確認）。
</content>
