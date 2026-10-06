// api/steam-card-image.js
//
// Same-origin image pass-through for the downloadable Compare card.
//
//   /api/steam-card-image?url=https%3A%2F%2Favatars.steamstatic.com%2F...
//
// The card is drawn on a <canvas> in the browser. A canvas that has drawn
// an image from another site can't be exported as a PNG ("tainted"), so
// the browser asks us for the image instead and we fetch it from Steam's
// CDN. Only Steam's image hosts are allowed.

const MAX_BYTES = 8 * 1024 * 1024;

function isAllowedHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return (
    host === "steamstatic.com" ||
    host.endsWith(".steamstatic.com") ||
    host === "steamcdn-a.akamaihd.net"
  );
}

export default async function handler(req, res) {
  let target;
  try {
    target = new URL(String(req.query?.url || ""));
  } catch {
    res.status(400).json({ error: "Provide ?url=<image url>" });
    return;
  }
  if (target.protocol !== "https:" || !isAllowedHost(target.hostname)) {
    res.status(400).json({ error: "Only Steam image hosts are allowed." });
    return;
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: "image/*",
        "User-Agent":
          "FreeGamesTracker/1.0 (+https://github.com/Adityasharma3010/FreeGamesTracker)",
        Referer: "https://store.steampowered.com/",
      },
      signal: AbortSignal.timeout(10000),
    });

    // A redirect must not lead us off Steam's hosts.
    if (upstream.url && !isAllowedHost(new URL(upstream.url).hostname)) {
      res.status(400).json({ error: "Redirected to a disallowed host." });
      return;
    }
    if (!upstream.ok) {
      res.status(upstream.status === 404 ? 404 : 502).end();
      return;
    }
    const type = upstream.headers.get("content-type") || "";
    if (!type.startsWith("image/")) {
      res.status(415).json({ error: "Not an image." });
      return;
    }
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length > MAX_BYTES) {
      res.status(413).json({ error: "Image too large." });
      return;
    }

    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    res.status(200).send(bytes);
  } catch (error) {
    console.error("Steam card image error:", error);
    res.status(502).json({ error: "Unable to load the image." });
  }
}
