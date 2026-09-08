// Spiritual Agent Oracle — Service Worker
// アプリの見た目（HTML/アイコン/フォント）はキャッシュ優先で高速表示・オフライン対応。
// メッセージ/コンテンツのデータ（GAS API）はネットワーク優先にして、内容が古くならないようにする。

const CACHE_NAME = "spiritual-agent-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // GASのAPI（メッセージ・コンテンツデータ）はネットワーク優先。
  // オフライン時のみ、直近で取得できていたデータを返す。
  if (url.hostname === "script.google.com") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // それ以外（自サイトのHTML/アイコン、Googleフォント等）はキャッシュ優先。
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => cached);
    })
  );
});
