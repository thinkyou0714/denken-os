// Service Worker — app shell を cache-first でキャッシュし、オフラインで動かす。
// 静的アセットは cache-first（調査の定石）。問題データもキャッシュして完全オフライン化。
// ★web/ のアセット(dist/app.js 等)を変更したらこの版数を必ず上げること。版数を上げると
//   このファイルのバイトが変わり SW 更新が走り、activate で旧キャッシュを破棄して新バンドルを取り直す。
//   (v3: numeric採点の空入力是正・数値比較・JST日境界・直近重複回避を配信)
//   (v4: タブ型SPA・FSRS・模試/復習/間違いノート/進捗/公式/設定・数式整形・220問を配信)
//   (v5: 一次フル模試の科目別足切り判定・学習ヒートマップを配信)
//   (v6: 図解(回路図/ベクトル図/ブロック図/特性曲線のインラインSVG)・構造化解説を配信)
//   (v7: UI刷新 — デザインシステム/ダーク最適化/セグメントタブ/カード磨き/モーションを配信)
//   (v8: テーマ切替/スパークライン/空状態/スケルトン/ヒートマップセル/目標リング/更新トースト)
//   (v9: モバイル下部タブバー(親指リーチ)・タブアイコン・印刷スタイルを配信)
//   (v10: 二次記述の部分点ルーブリック自己採点を配信)
//   (v11: 質問タブ＝AIチャット（内蔵ナレッジ＋BYOK Claude・RAG接地・出典付き）を配信)
//   (v12: 品質向上 — 模試時間制限の本実装＋見直し・バックアップ・ヒント開示・公式検索・
//         番号バッジ・経過時間・目標達成トースト・オンボーディング・読込リトライ・保存安全化)
//   (v13: 信頼性/a11y/リテンション — エラーバウンダリ・オフライン表示・復習1日上限バッチ化・
//         ストリーク予兆ナッジ・タブのrole=tab/矢印キー操作)
//   (v14: ゲーミフィケーション基盤 — XP/レベル/称号・デイリークエスト・ストリークお守り・
//         実績バッジ・マスコット「デンタマ」・紙吹雪/効果音/XPフロート・週間XP・
//         数値空入力ガード・模試中断確認)
//   (v15: 継続強化第2弾 — ウィークリークエスト・科目別XP・次称号ティーザー・自分の記録・
//         キーボード評価(1〜3)・「あと1問」ナッジ・デンタマ微アニメ/非表示設定・
//         マイクロモーション・グローバルエラー捕捉・再表示時のお守りブリッジ)
//   (v16: 節目と導線 — 目標設定ウィザード・セッション終了サマリー(明日のクエスト予告)・
//         ストリーク大台祝賀(30/50/100…)・実績3種追加(初マスター/無傷の三十日/月間皆勤賞)・
//         マスター論点チップ・ゴーストレース・ショートカットヘルプ(?)・A2HS導線・コンボ発光)
//   (v17: 報酬と健全性 — クエスト全達成後の正解XP×1.5ブースト・おやすみ予約(🔥維持)・
//         デンタマ成長(Lv10星/Lv20ヘルメット/Lv40王冠)＋まめ知識12種・効果音音量4段階・
//         実績タップでシェア・ヘルプのカード内クリック誤閉じ修正)
//   (v18: 問題データ拡充 — テンプレ88種・788問(法規77/MC49)を配信。出荷済み405問のIDは温存し、新規は内容由来の安定ID)
//   (v19: リファクタ — 分割バンドル・保存失敗可視化(lastPersistError)・日付ユーティリティ一元化・
//         sanitizeSvg・SW堅牢化(fetch失敗フォールバック・install失敗時skipWaiting抑制))
//   (v20: Wave2リファクタ — CSP/SRI・SW版数自動化・RLS補完・fuzz/統合テスト追加)
// ★ CACHE の版数は build:web が自動更新する（プレースホルダ置換）。手動編集禁止。
const CACHE = "denken-os-v20-fb895313";
const ASSETS = ["./", "./index.html", "./dist/app.js", "./problems.json", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
    // addAll が失敗した場合（ネットワークエラー等）は skipWaiting しない。
    // アクティブ化を保留することで、破損したキャッシュが使われるのを防ぐ。
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // ナビゲーションリクエスト（ページ遷移）でネットワーク失敗時は app shell へフォールバック。
        if (event.request.mode === "navigate") {
          return caches.match("./").then((shell) => shell ?? Response.error());
        }
        return Response.error();
      });
    }),
  );
});
