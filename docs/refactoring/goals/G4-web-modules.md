# G4: web モジュール群の重複根絶・保存失敗の可視化・PWA/ビルド堅牢化

対応アイデア: I-034〜I-049（[ideas-100.md](../ideas-100.md)）
Wave: 1（G1/G2/G3/G5 と並列実行）

## 目的（根本原因R3/R4/R5）

web/src の日付計算重複（4箇所）を一元化し、localStorage の無音失敗を検知可能にし、
SW のプリキャッシュ競合と build-web の盲点（サイズ・sourcemap）を塞ぐ。

## 所有ファイル（これ以外は編集禁止）

- `web/src/*.ts` の **app.ts 以外すべて**（store, xp, quests, achievements, mascot, exam, review, grade,
  dashboard, chat, settings, stats, retention, freeze, fx, plan, select, backup, errors, format, formulas, mathfmt）
- 新規: `web/src/dates.ts`, `web/src/sanitize.ts`
- `web/index.html`, `web/sw.js`, `web/manifest.webmanifest`, `scripts/build-web.ts`
- 新規テストの**追加のみ**: `tests/web/dates.test.ts`, `tests/web/sanitize.test.ts`（既存テストの変更は禁止）

## 他タスクとの契約（重要 — G6 が Wave 2 で依存）

- `web/src/dates.ts` は最低限 `JST_OFFSET_MS`, `DAY_MS`, `dayIndex(ms, offsetMs?)`, `sameJstDay(a, b)` を export。
- `web/src/sanitize.ts` は `sanitizeSvg(svg: string): string`（`<script`・`on*=` 属性・外部 `href`/`xlink:href` を検出したら
  空文字を返し console.warn）を export。
- `web/src/store.ts` の `LocalProgress` に `lastPersistError: { key: string; atMs: number } | null` を返す
  public getter を追加（保存失敗時に記録、成功でクリア）。**既存メソッドのシグネチャは不変**。
- **app.ts は編集禁止**（G6 が Wave 2 で dates.ts/sanitize.ts/lastPersistError を取り込む）。
- index.html は「app.ts が参照する DOM id・クラス構造を変えない」こと（追加的変更のみ: meta、CSS 変数、:invalid 等）。
- 既存テスト（tests/web/**）は無変更でグリーンであること。

## 実装項目

1. **`web/src/dates.ts` 新設**（I-034）: JST_OFFSET_MS/DAY_MS/dayIndex/sameJstDay を実装（JSDoc に「日本国内試験のため
   日境界は JST 固定」の設計意図）。`quests.ts`/`retention.ts`/`dashboard.ts` の重複定義を import に置換
   （これらの既存 export に dayIndexOf 等があれば re-export で互換維持）。`tests/web/dates.test.ts` を追加。
2. **保存失敗の可視化**（I-035）: store.ts の `safeSet` 失敗時に内部記録し `lastPersistError` getter で公開。
   失敗してもクラッシュさせない方針は不変。`tests/web/`（新規ファイルでよい）に ThrowingStorage 相当での検証を追加可。
3. **破損読み込みの検知**（I-036）: store.ts ほか `JSON.parse` を握りつぶしている箇所（chat.ts, achievements.ts,
   freeze.ts 等）で、파損時に `console.warn(キー名)` を出してから fallback（挙動不変・診断可能化のみ）。
4. **`web/src/sanitize.ts` 新設**（I-037, I-048）: sanitizeSvg を実装し、`mascot.ts` の SVG を返す箇所に
   「信頼済み・ビルド時固定」コメントを明記。`tests/web/sanitize.test.ts`（script混入・onload属性・外部参照・正常SVG）。
5. **SW 堅牢化**（I-038〜I-040）: `web/sw.js` で
   - install: `caches.open(...).then(addAll).then(() => self.skipWaiting())` とし、失敗時は skipWaiting しない。
   - fetch: `event.request.mode === "navigate"` で未キャッシュ＆fetch失敗時に `caches.match("./")` へフォールバック。
   - `CACHE` を `denken-os-v19` に上げ、版数コメントに「v19: リファクタ（分割バンドル・保存失敗可視化ほか）」を追記。
6. **index.html**（I-041〜I-043）: meta description 追加。ダークテーマ `--muted` を `#aab4c8` 程度へ
   （コントラスト比 ≥ 4.5:1 を満たす値を選ぶ。配色の見た目の大幅変更はしない）。`input:invalid` の枠色 CSS 追加。
7. **build-web.ts**（I-044〜I-046）: ビルド後に app.js / app.js.map / problems.json の生バイト数と gzip サイズを表形式で出力。
   sourcemap の `sources` が空なら throw。esbuild 失敗時は `errors` 配列を整形して表示。
8. **importBackup**（I-047）: 未知バージョン時のエラーメッセージを「このアプリより新しいバックアップです。アプリを更新してください」に。
9. **JSDoc 補完**（I-049）: web/src 各モジュールの公開関数で欠けているものを補う（全数でなくてよい。export された関数優先）。

## 受け入れ基準

- `npx vitest run tests/web` 全グリーン（既存テスト無変更）。
- `npm run build:web` 成功・サイズレポートが出力される。
- `npm run typecheck:web` エラーなし。
- `npx biome check web/src web/sw.js scripts/build-web.ts` エラーなし。
- `grep -n "9 \* 60 \* 60" web/src/*.ts` が dates.ts 以外でヒットしない。
