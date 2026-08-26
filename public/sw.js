// App shell caching for offline/installable support.
//
// IMPORTANT: this is network-first, not cache-first. The previous
// cache-first version caused a real bug: it served an old cached
// index.html forever, which pointed at hashed JS/CSS bundle filenames
// (Vite gives every build's files a unique content hash) that no longer
// exist once a new deployment goes out — Vercel only serves the latest
// build's files, so the old hash 404s and the page never mounts,
// showing a blank white screen until the cache is manually cleared.
//
// Network-first means an online visitor always gets the current
// deployment. The cache is only a fallback for genuine offline use,
// which is what a PWA shell cache is actually supposed to be for — and
// it's kept fresh automatically, since every successful online fetch
// re-saves its response into the cache.
const CACHE = "fgt-shell-v2"; // bumped so the old (buggy) cache gets purged below
const SHELL = ["/", "/index.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never intercept giveaway data or our own API — always live network,
  // never cached, never stale.
  if (url.hostname.includes("gamerpower.com") || url.pathname.startsWith("/api/")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (e.request.method === "GET" && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match("/index.html")))
  );
});
