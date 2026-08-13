const CACHE_NAME = "dingwei-public-v1";
const ASSET_PATTERN = /\.(?:css|js|png|jpe?g|gif|svg|webp|woff2?)$/i;

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) { return key !== CACHE_NAME; }).map(function (key) { return caches.delete(key); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.indexOf("/api/") === 0 || url.pathname.indexOf("dw-console") >= 0 || url.pathname.indexOf("dw-disclosure") >= 0) return;
  if (!ASSET_PATTERN.test(url.pathname)) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const refresh = fetch(event.request).then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { return cache.put(event.request, copy); });
        }
        return response;
      });
      return cached || refresh;
    })
  );
});
