/* Bender HQ — offline cache.
   Point is simple: once it's loaded on the plane, it keeps working in a pub
   basement in Liverpool with no signal and no roaming data. */
const CACHE = "bender-hq-v5";
const TILES = "bender-hq-tiles-v1";
const FILES = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
               "./vendor/leaflet.js", "./vendor/leaflet.css", "./vendor/nacl-fast.min.js",
               "./fonts/barlow-400.woff2", "./fonts/barlow-500.woff2", "./fonts/barlow-600.woff2", "./fonts/barlow-700.woff2",
               "./fonts/barlow-condensed-500.woff2", "./fonts/barlow-condensed-600.woff2", "./fonts/barlow-condensed-700.woff2", "./fonts/barlow-condensed-800.woff2"];
const MAX_TILES = 1500;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== TILES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimTiles(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  /* Map tiles: cache-first, so any street you've looked at (or pre-saved) works with no signal. */
  if (url.hostname === "server.arcgisonline.com") {
    e.respondWith(caches.open(TILES).then(async (c) => {
      const hit = await c.match(e.request.url);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) { c.put(e.request.url, res.clone()); if (Math.random() < 0.05) trimTiles(c); }
      return res;
    }));
    return;
  }

  /* The crew relay (live stream) and heart-rate widgets must never be cached. */
  if (url.origin !== self.location.origin) return;

  /* App shell: network first so edits show up, cache fallback so no signal still works. */
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
