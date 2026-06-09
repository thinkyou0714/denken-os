// Service Worker — app shell を cache-first でキャッシュし、オフラインで動かす。
// 静的アセットは cache-first（調査の定石）。問題データもキャッシュして完全オフライン化。
// ★web/ のアセット(dist/app.js 等)を変更したらこの版数を必ず上げること。版数を上げると
//   このファイルのバイトが変わり SW 更新が走り、activate で旧キャッシュを破棄して新バンドルを取り直す。
//   (v3: numeric採点の空入力是正・数値比較・JST日境界・直近重複回避を配信)
//   (v4: タブ型SPA・FSRS・模試/復習/間違いノート/進捗/公式/設定・数式整形・220問を配信)
const CACHE = "denken-os-v4";
const ASSETS = ["./", "./index.html", "./dist/app.js", "./problems.json", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
