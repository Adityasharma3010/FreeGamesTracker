import React, { useEffect, useState } from "react";

// --- Server resolver: authoritative, but not always fast -------------------
// api/steam-image.js does the real work (AppDetails → StoreBrowse → PICS)
// and only ever returns URLs Steam's own metadata actually points to for
// that game, so it can't return a wrong "no artwork" placeholder image.
// A newly-hashed store_item_assets URL also doesn't always propagate to
// every Steam CDN edge at the same time, so each URL it returns is
// expanded across all three known hosts before being tried.
const STEAM_ASSET_HOSTS = [
  "https://shared.akamai.steamstatic.com",
  "https://shared.cloudflare.steamstatic.com",
  "https://shared.fastly.steamstatic.com",
];

function expandAssetHosts(url) {
  if (typeof url !== "string" || !url.trim()) return [];
  try {
    const parsed = new URL(url.trim());
    const isSharedCdn = STEAM_ASSET_HOSTS.some(
      (host) => parsed.hostname === new URL(host).hostname,
    );
    if (!isSharedCdn) return [url.trim()];
    return STEAM_ASSET_HOSTS.map(
      (host) => `${host}${parsed.pathname}${parsed.search}`,
    );
  } catch {
    return [url.trim()];
  }
}

function expandAllHosts(urls) {
  const expanded = [];
  for (const url of urls) expanded.push(...expandAssetHosts(url));
  return [...new Set(expanded.filter(Boolean))];
}

// Last resort if the resolver comes back with nothing at all for a given
// appid — better than showing nothing for a genuinely unlisted game.
const legacyCandidates = (appid) =>
  STEAM_ASSET_HOSTS.flatMap((host) => [
    `${host}/steam/apps/${appid}/header.jpg`,
    `${host}/steam/apps/${appid}/capsule_616x353.jpg`,
  ]);

// --- Request batching -------------------------------------------------------
// A library/wishlist grid mounts every tile at once, and each tile used to
// fire its OWN /api/steam-image?appid=X call the instant it mounted — a
// 289-game library meant ~289 simultaneous serverless invocations, each
// independently hitting Steam's AppDetails/StoreBrowse/PICS endpoints.
// That's exactly the kind of burst that gets rate-limited/blocked by
// Steam, which is why only a handful of games were resolving and most
// (Batman included) were coming back empty. Every appid requested within
// a short window is now coalesced into as few /api/steam-image?appids=…
// batch calls as possible instead, using the endpoint's own existing
// batch support (it was built for this — nothing changed there).
const BATCH_WINDOW_MS = 40;
const BATCH_MAX = 20; // small enough to stay well under a serverless function's execution time limit even when every appid in the batch needs the slow AppDetails→StoreBrowse→PICS chain

// Resolved values, kept forever for the tab's lifetime once known — a
// game you've already seen shows instantly on every later tile/page with
// no flash of a guess or a skeleton in between.
const resolvedValueCache = new Map(); // appid -> string[]
const resolverCache = new Map(); // appid -> Promise<string[]>

let batchQueue = [];
let batchTimer = null;

function flushBatch() {
  const queued = batchQueue;
  batchQueue = [];
  batchTimer = null;
  if (!queued.length) return;

  for (let i = 0; i < queued.length; i += BATCH_MAX) {
    const chunk = queued.slice(i, i + BATCH_MAX);
    const appidsParam = chunk.map((entry) => entry.appid).join(",");

    fetch(`/api/steam-image?appids=${appidsParam}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const results = body?.results || {};
        chunk.forEach(({ appid, resolve }) => {
          const entry = results[appid];
          const urls = Array.isArray(entry?.urls)
            ? expandAllHosts(entry.urls)
            : [];
          resolvedValueCache.set(appid, urls);
          resolve(urls);
        });
      })
      .catch(() => {
        chunk.forEach(({ appid, resolve }) => {
          resolvedValueCache.set(appid, []);
          resolve([]);
        });
      });
  }
}

function resolveViaServer(appid) {
  const id = String(appid);
  if (!resolverCache.has(id)) {
    const promise = new Promise((resolve) => {
      batchQueue.push({ appid: id, resolve });
      if (!batchTimer) batchTimer = setTimeout(flushBatch, BATCH_WINDOW_MS);
    });
    resolverCache.set(id, promise);
  }
  return resolverCache.get(id);
}

// --- Quick guess: paints instantly while the resolver call is in flight ---
// This is NOT trusted as the final answer — Steam serves a generic 200
// gray "no artwork" placeholder at this conventional path for a lot of
// newer titles instead of 404ing, so this alone used to get tiles stuck
// on the wrong image. Once the resolver responds, its answer always
// replaces whatever this guess painted (same URL = no visible change,
// different URL = a quick, rare correction).
const quickGuess = (appid) =>
  `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;

function Skeleton({ className, style }) {
  return (
    <div className={className} style={style} aria-hidden="true">
      <div className="w-full h-full img-shimmer" />
    </div>
  );
}

export default function SteamGameImage({
  appid,
  alt = "",
  className,
  style,
  onAllFailed,
}) {
  const id = String(appid);
  // Read any already-known answer synchronously on first render, so a
  // previously-resolved game never flashes a guess or a skeleton again.
  const [resolved, setResolved] = useState(() => resolvedValueCache.get(id));
  const [j, setJ] = useState(0);
  const [quickFailed, setQuickFailed] = useState(false);

  useEffect(() => {
    const cached = resolvedValueCache.get(id);
    setResolved(cached);
    setJ(0);
    setQuickFailed(false);

    if (cached !== undefined) return; // already known, nothing to fetch

    let cancelled = false;
    resolveViaServer(id).then((urls) => {
      if (cancelled) return;
      setResolved(urls.length > 0 ? urls : legacyCandidates(id));
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const ready = Array.isArray(resolved);
  const exhausted = ready && j >= resolved.length;

  useEffect(() => {
    if (exhausted && onAllFailed) onAllFailed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exhausted]);

  if (exhausted) return null; // lets the caller's own fallback show

  if (ready) {
    return (
      <img
        src={resolved[j]}
        alt={alt}
        loading="lazy"
        className={className}
        style={style}
        onError={() => setJ((n) => n + 1)}
      />
    );
  }

  // Resolver still in flight: paint the quick guess if it hasn't already
  // 404'd, otherwise show a loading skeleton instead of a blank tile.
  if (!quickFailed) {
    return (
      <img
        src={quickGuess(id)}
        alt={alt}
        loading="lazy"
        className={className}
        style={style}
        onError={() => setQuickFailed(true)}
      />
    );
  }

  return <Skeleton className={className} style={style} />;
}
