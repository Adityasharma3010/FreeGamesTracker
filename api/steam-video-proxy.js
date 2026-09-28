// Proxies Steam CDN trailer requests through our own server.
//
// Steam's video CDN enforces Referer/Origin-based hotlink protection.
// api/steam-appdetails.js's own server-to-server verification call can
// fake that header — but the person's actual BROWSER can't: it sends the
// real page's own address as the referrer (this site's domain), and
// Steam's CDN rejects that, which is exactly why a URL that verified
// fine server-side still showed "this trailer can't play here" once the
// browser tried to load it directly.
//
// Routing playback through this endpoint fixes that: the browser only
// ever talks to our own domain, and THIS server — which can send the
// header Steam actually wants — is the one that fetches from Steam.
//
// Supports Range requests (needed for seeking/scrubbing) by forwarding
// the client's Range header upstream and mirroring Steam's response
// status/headers straight back.
//
// Usage: /api/steam-video-proxy?url=<encoded Steam CDN URL>
// The url is checked against a fixed allowlist of Steam's own CDN
// hostnames before being fetched, so this can't be used to proxy
// arbitrary third-party URLs.

const ALLOWED_HOSTS = new Set([
  "video.akamai.steamstatic.com",
  "video.cloudflare.steamstatic.com",
  "video.fastly.steamstatic.com",
  "shared.akamai.steamstatic.com",
  "shared.cloudflare.steamstatic.com",
  "shared.fastly.steamstatic.com",
  "steamcdn-a.akamaihd.net",
]);

const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
];

export default async function handler(req, res) {
  const { url } = req.query;

  if (typeof url !== "string" || !url) {
    res.status(400).json({ error: "Provide ?url=" });
    return;
  }

  let target;
  try {
    target = new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid url" });
    return;
  }

  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    res.status(400).json({ error: "That host isn't a recognized Steam CDN" });
    return;
  }

  const upstreamHeaders = {
    "User-Agent":
      "FreeGamesTracker/1.0 (+https://github.com/Adityasharma3010/FreeGamesTracker)",
    Referer: "https://store.steampowered.com/",
    Origin: "https://store.steampowered.com",
  };
  // Forwarded so the <video> element can still seek/scrub — without this,
  // every seek would have to restart the whole file from byte 0.
  if (req.headers.range) upstreamHeaders.Range = req.headers.range;

  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    res.status(502).json({ error: "Could not reach Steam's CDN" });
    return;
  }

  if (!upstream.ok && upstream.status !== 206) {
    res
      .status(upstream.status)
      .json({ error: `Steam CDN responded ${upstream.status}` });
    return;
  }

  res.status(upstream.status);
  for (const header of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(header);
    if (value) res.setHeader(header, value);
  }
  res.setHeader("Cache-Control", "public, max-age=86400, immutable");

  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  req.on("close", () => {
    reader.cancel().catch(() => {});
  });

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } catch {
    // client disconnected mid-stream, or the upstream connection dropped
    // — nothing further to send either way.
  } finally {
    res.end();
  }
}
