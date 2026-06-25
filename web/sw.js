// Service Worker — app shell を cache-first でキャッシュし、オフラインで動かす。
// 静的アセットは cache-first（調査の定石）。問題データもキャッシュして完全オフライン化。
// ★版数(CACHE)は build:web が配信アセットの内容ハッシュで自動更新する（手で上げる必要は無い）。
//   コミット時のプレースホルダは __BUILD_HASH__。ビルドで denken-os-<hash> に置換され、
//   アセットが変わった時だけ版が変わって SW 更新→旧キャッシュ破棄が走る（版上げ忘れ防止）。
const CACHE = "denken-os-47c4bfc132a6";
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
