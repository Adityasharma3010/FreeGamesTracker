// Minimal service worker: cache the app shell for offline/installable
// support. Deliberately does NOT cache the GamerPower API responses —
// giveaways change constantly, so those always go to the network.
const CACHE = "fgt-shell-v1";
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

  // Never cache API calls — always hit network for live giveaway data.
  if (url.hostname.includes("gamerpower.com")) return;

  // Shell: cache-first, falling back to network.
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => caches.match("/index.html")))
  );
});
