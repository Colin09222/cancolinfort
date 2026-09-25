/* Bender HQ — offline cache.
   Point is simple: once it's loaded on the plane, it keeps working in a pub
   basement in Liverpool with no signal and no roaming data. */
const CACHE = "bender-hq-v3";
const FILES = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Same-origin only: the crew relay (ntfy.sh live stream) and heart-rate widgets must
   never be cached. Network first so edits show up, cache fallback so no signal still works. */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request, {ignoreSearch: true}).then((hit) => hit || caches.match("./index.html")))
  );
});
