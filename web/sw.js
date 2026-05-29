// Service Worker — オフライン動作と「再訪時の自動更新」を両立する。
//
// 旧実装は cache-first だったため、dist/app.js や problems.json を更新しても
// 再訪ユーザーにはキャッシュ名を手で上げない限り永久に古い版が配信されていた。
// → stale-while-revalidate(SWR) に変更: キャッシュを即返ししつつ裏で取得して
//   キャッシュを更新する。次回アクセスから最新が反映され、オフラインでも動く。
const CACHE = "denken-os-v3";
const ASSETS = ["./", "./index.html", "./dist/app.js", "./problems.json", "./manifest.webmanifest"];

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

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  // 裏でネットワーク取得→成功すればキャッシュ更新（次回反映）。失敗は無視（オフライン）。
  const network = fetch(req)
    .then((res) => {
      if (res && res.status === 200 && res.type === "basic") cache.put(req, res.clone());
      return res;
    })
    .catch(() => undefined);
  event.waitUntil(network);

  // キャッシュがあれば即返し（高速・オフライン）、無ければネットワークを待つ。
  const fresh = cached || (await network);
  if (fresh) return fresh;
  // ナビゲーションのオフラインフォールバックは app shell を返す。
  if (req.mode === "navigate") {
    const shell = await cache.match("./index.html");
    if (shell) return shell;
  }
  return Response.error();
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // 同一オリジンのみ制御（外部リソースは素通し）。
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(staleWhileRevalidate(event, req));
});
