// Fetches rich per-game info (description, screenshots, trailers, recent
// news) for ONE app at a time, only when the user opens a game's detail
// page — not a bulk operation (bulk calls risk Steam's rate limits).

// News doesn't need a Steam API key (ISteamNews is public) and can fail
// independently of the store page without taking the rest down with it.
// Steam's news "contents" field is BBCode (occasionally with raw HTML
// mixed in), and its images use a macro instead of a real URL:
//   [img]{STEAM_CLAN_IMAGE}/<clanid>/<hash>.jpg[/img]
// A plain tag-stripping regex was deleting the [img] wrapper but leaving
// the literal "{STEAM_CLAN_IMAGE}/..." text behind — that was the "images
// aren't showing, and there's junk text where they should be" bug.
// This parses the post into an ordered list of paragraph/image blocks
// instead of one flattened string, so the modal can render real <img>
// tags in the right place rather than guessing from plain text.
const CLAN_IMAGE_BASE = "https://clan.cloudflare.steamstatic.com/images"; // macro is always followed by "/<clanid>/<hash>.ext"

function resolveClanImage(src) {
  if (typeof src !== "string") return null;
  const resolved = src
    .replace("{STEAM_CLAN_IMAGE}", CLAN_IMAGE_BASE)
    .replace("{STEAM_CLAN_LOC_IMAGE}", CLAN_IMAGE_BASE);
  return /^https?:\/\//i.test(resolved) ? resolved : null;
}

function parseNewsContent(raw) {
  if (typeof raw !== "string" || !raw.trim()) return [];

  // Steam news bodies mix several syntaxes for the same kinds of thing —
  // each block type below is pulled out as a placeholder token FIRST
  // (in a fixed order, most-specific pattern first) so the plain-tag
  // stripping pass at the end can't accidentally eat something a later
  // pattern still needed to match.
  const blocks = []; // { type, ... } — index becomes the token's number
  const token = (b) => {
    blocks.push(b);
    return `\n§B${blocks.length - 1}§\n`;
  };

  let text = raw
    // [previewyoutube="VIDEO_ID;size"][/previewyoutube] — Steam's embedded
    // video widget. The closing tag (if present) is swallowed too.
    .replace(
      /\[previewyoutube="?([a-zA-Z0-9_-]+);[^\]]*"?\]\s*(\[\/previewyoutube\])?/gi,
      (_m, id) => token({ type: "youtube", id }),
    )
    // [img]URL[/img] — the common wrapped form.
    .replace(/\[img\]([\s\S]*?)\[\/img\]/gi, (_m, src) =>
      token({ type: "image", src: resolveClanImage(src.trim()) }),
    )
    // [img src="URL"] — a self-closing variant Steam also uses, with no
    // [/img]. This was the "images still showing as literal text" bug:
    // the old parser only ever matched the wrapped form above.
    .replace(/\[img\s+src=["']([^"']+)["']\s*\]/gi, (_m, src) =>
      token({ type: "image", src: resolveClanImage(src.trim()) }),
    )
    // <img src="URL"> — raw HTML, when a post mixes HTML into the BBCode.
    .replace(/<img[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (_m, src) =>
      token({ type: "image", src: resolveClanImage(src.trim()) }),
    )
    // [url=HREF]TEXT[/url] — a properly-closed labeled link.
    .replace(
      /\[url=["']?([^\]"']+)["']?\]([\s\S]*?)\[\/url\]/gi,
      (_m, href, label) =>
        token({
          type: "link",
          href: resolveClanImage(href.trim()) || href.trim(),
          label: label.trim() || href.trim(),
        }),
    )
    // [url]HREF[/url] — a bare, properly-closed link.
    .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, (_m, href) =>
      token({ type: "link", href: href.trim(), label: href.trim() }),
    )
    // [url=HREF] with NO closing tag — Steam's own news feed sometimes
    // sends these unbalanced (seen right before a [dynamiclink...], which
    // may be acting as an implicit close on Steam's own renderer). Can't
    // safely capture a label without a real end tag, so this becomes a
    // link chip using the URL itself as the label, and whatever text
    // follows just continues as normal flowing text.
    .replace(/\[url=["']?([^\]"']+)["']?\]/gi, (_m, href) =>
      token({ type: "link", href: href.trim(), label: href.trim() }),
    )
    // [dynamiclink href="HREF"] — Steam's own store/wishlist CTA widget.
    // It never carries its own visible label in the raw text (the label
    // is rendered by Steam's client from the href), so there's nothing
    // meaningful to show — dropped rather than shown as a bare mystery
    // link. The modal's own "View original on Steam" link covers this.
    .replace(/\[dynamiclink[^\]]*\]/gi, "");

  text = text
    .replace(/\[\/?[a-z0-9=*"' .:/%-]*\]/gi, "") // remaining BBCode tags ([b], [/b], [*], etc.)
    .replace(/<[^>]+>/g, "") // remaining HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n");

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^§B(\d+)§$/);
      if (m) {
        const b = blocks[Number(m[1])];
        if (b.type === "image") return b.src ? b : null;
        return b;
      }
      return { type: "text", value: line };
    })
    .filter(Boolean);
}

function plainExcerpt(blocks, max = 200) {
  const text = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.value)
    .join(" ");
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

// Same User-Agent used everywhere else in this project that talks to
// Steam (api/steam-image.js already had it). Steam's endpoints appear to
// bot-detect requests with no/generic User-Agent — this was the actual
// reason appdetails came back success:false from our server even for
// appids that returned real data when you hit Steam directly yourself.
//
// The Cookie is Steam's own age-verification bypass: appdetails silently
// returns success:false for mature-rated games (Control included) unless
// the request looks like it already passed the age gate, which a real
// browser session normally has cookies for. birthtime is a Unix timestamp
// (this one is Jan 1 1970) old enough to satisfy any age check.
const STEAM_FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "FreeGamesTracker/1.0 (+https://github.com/Adityasharma3010/FreeGamesTracker)",
  Cookie: "birthtime=0; lastagecheckage=1-January-1970; wants_mature_content=1",
};

async function fetchNews(appid) {
  try {
    // feeds=steam_community_announcements restricts this to Steam's own
    // announcement feed (what shows on the store/community page) rather
    // than every syndicated source Steam sometimes mirrors in.
    // maxlength=0 asks for the FULL body, not a truncated preview — needed
    // so a click can show the article in place instead of linking out.
    const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appid}&count=3&maxlength=0&format=json&feeds=steam_community_announcements`;
    const r = await fetch(url, {
      headers: STEAM_FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const json = await r.json();
    const items = json?.appnews?.newsitems;
    if (!Array.isArray(items)) return [];
    return items.slice(0, 3).map((n) => {
      const blocks = parseNewsContent(n.contents);
      return {
        gid: n.gid,
        title: n.title || null,
        url: n.url || null, // kept as an optional "view original" link, not the primary action
        author: n.author || null,
        date: n.date || null, // unix seconds
        excerpt: plainExcerpt(blocks),
        blocks,
      };
    });
  } catch {
    return [];
  }
}

// Live player count — public endpoint, no API key needed.
async function fetchPlayerCount(appid) {
  try {
    const r = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`,
      { headers: STEAM_FETCH_HEADERS, signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) return null;
    const json = await r.json();
    return json?.response?.result === 1
      ? (json.response.player_count ?? null)
      : null;
  } catch {
    return null;
  }
}

// Review summary — Steam's storefront review endpoint. num_per_page=0
// skips fetching actual review text, just the aggregate counts.
async function fetchReviewSummary(appid) {
  try {
    const r = await fetch(
      `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0`,
      { headers: STEAM_FETCH_HEADERS, signal: AbortSignal.timeout(8000) },
    );
    if (!r.ok) return null;
    const json = await r.json();
    const q = json?.query_summary;
    if (!q || !q.review_score_desc) return null;
    return {
      description: q.review_score_desc, // e.g. "Very Positive"
      totalPositive: q.total_positive ?? 0,
      totalReviews: q.total_reviews ?? 0,
      percentPositive:
        q.total_reviews > 0
          ? Math.round((q.total_positive / q.total_reviews) * 100)
          : null,
    };
  } catch {
    return null;
  }
}

// DLC list. `d.dlc` is only appids — resolving each to a name/price needs
// its own appdetails call, so this is capped at 6 and run in parallel,
// with filters=basic,price_overview to keep each response small. A DLC
// that fails to resolve (delisted, region-locked) is just skipped.
async function fetchDlc(dlcAppids) {
  const ids = (dlcAppids || []).slice(0, 6);
  if (ids.length === 0) return [];
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const r = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${id}&filters=basic,price_overview`,
        { headers: STEAM_FETCH_HEADERS, signal: AbortSignal.timeout(7000) },
      );
      const json = await r.json();
      const entry = json?.[String(id)];
      if (!entry?.success || !entry.data) return null;
      const d = entry.data;
      const po = d.price_overview;
      return {
        appid: id,
        name: d.name || `App ${id}`,
        free: !!d.is_free,
        priceFinal: po ? po.final / 100 : null,
        priceInitial: po ? po.initial / 100 : null,
        discountPercent: po ? po.discount_percent : 0,
        currency: po ? po.currency : null,
      };
    }),
  );
  return results
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value);
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const appDetailsCache = new Map(); // "appid:cc" -> { fetchedAt, entry }

// store.steampowered.com/api/appdetails is undocumented and has a real
// per-IP rate limit. Without a fixed cc= (country code) it also guesses
// region from the calling server's IP on every request, which can flip
// results between calls for the exact same game. Both together are what
// made previously-working games suddenly come back as found:false.
// cc is the visitor's own region (from Vercel's geo header, see handler
// below) rather than a hardcoded "us" — mainly matters for price/currency
// and the rare title that's actually region-locked.
async function fetchAppDetailsRaw(appid, cc) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english&cc=${encodeURIComponent(cc)}`;
  const r = await fetch(url, {
    headers: STEAM_FETCH_HEADERS,
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error(`Steam responded ${r.status}`);
  const json = await r.json();
  return json?.[String(appid)];
}

// One retry after a short delay: a rate-limited or transiently-failed
// call often succeeds a second later, and this costs nothing extra for
// the common case where the first call just works.
async function fetchAppDetailsWithRetry(appid, cc) {
  try {
    return await fetchAppDetailsRaw(appid, cc);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      return await fetchAppDetailsRaw(appid, cc);
    } catch {
      return undefined;
    }
  }
}

// Cache successful (entry.success === true) results for an hour so a
// game you already resolved doesn't cost another appdetails call every
// time you or a friend opens its page — the single biggest lever on
// staying under Steam's rate limit. A failed/false result is NOT cached,
// so a genuinely rate-limited response gets retried on the next request
// rather than being remembered as permanently missing. Keyed by cc too,
// so a result fetched for one visitor's region is never served — with
// its price/currency or a region-lock decision — to a visitor elsewhere.
async function fetchAppDetailsCached(appid, cc) {
  const key = `${appid}:${cc}`;
  const cached = appDetailsCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.entry;
  }
  const entry = await fetchAppDetailsWithRetry(appid, cc);
  if (entry?.success && entry.data) {
    appDetailsCache.set(key, { fetchedAt: Date.now(), entry });
  }
  return entry;
}

export default async function handler(req, res) {
  const { appid } = req.query;
  if (!appid || !/^\d+$/.test(String(appid))) {
    res.status(400).json({ error: "Provide a numeric ?appid=" });
    return;
  }

  // Vercel sets this automatically on every request — no extra lookup
  // needed. Falls back to "us" for local dev (vercel dev doesn't set it).
  const cc = (req.headers["x-vercel-ip-country"] || "us").toLowerCase();

  const newsPromise = fetchNews(appid);
  const playerCountPromise = fetchPlayerCount(appid);
  const reviewsPromise = fetchReviewSummary(appid);

  try {
    const entry = await fetchAppDetailsCached(appid, cc);

    if (!entry?.success || !entry.data) {
      // Not every appid has a store page (demos, tools, delisted games,
      // region-restricted) — a normal outcome, not an error. News can
      // still exist for it, so it's included rather than dropped.
      res.status(200).json({
        found: false,
        news: await newsPromise,
        playerCount: await playerCountPromise,
        reviews: await reviewsPromise,
      });
      return;
    }

    const d = entry.data;

    // Some Steam media URLs still come back as http:// — upgrade them so
    // browsers on https (the deployed site) don't block them as mixed content.
    const https = (u) =>
      typeof u === "string" ? u.replace(/^http:\/\//i, "https://") : null;

    // short_description is Steam's own plain-text summary. The detailed
    // description is raw HTML that would need sanitizing first.
    const screenshots = Array.isArray(d.screenshots)
      ? d.screenshots.slice(0, 12).map((s) => ({
          thumb: https(s.path_thumbnail),
          full: https(s.path_full),
        }))
      : [];

    // Trailers: Steam gives mp4 and webm at "480" and "max" quality.
    const pick = (o) => (o ? https(o.max || o["480"] || null) : null);
    const movies = Array.isArray(d.movies)
      ? d.movies.slice(0, 3).map((m) => ({
          id: m.id,
          name: m.name || null,
          thumbnail: https(m.thumbnail),
          mp4: pick(m.mp4),
          webm: pick(m.webm),
          // Steam has been moving trailers to HLS streams (.m3u8); passed
          // through so the frontend can play them if mp4/webm are missing.
          hls: https(m.hls_h264 || m.hls || null),
        }))
      : [];

    const news = await newsPromise;
    const playerCount = await playerCountPromise;
    const reviews = await reviewsPromise;
    const dlc = await fetchDlc(d.dlc);

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    res.status(200).json({
      found: true,
      description: d.short_description || null,
      screenshots,
      movies,
      news,
      // kept so the old popup detail view (SteamConnect.jsx) still works
      movie: movies[0]
        ? { thumbnail: movies[0].thumbnail, mp4: movies[0].mp4 }
        : null,
      genres: Array.isArray(d.genres) ? d.genres.map((g) => g.description) : [],
      playerCount,
      reviews,
      dlc,
      price: d.price_overview
        ? {
            final: d.price_overview.final / 100,
            initial: d.price_overview.initial / 100,
            discountPercent: d.price_overview.discount_percent,
            currency: d.price_overview.currency,
          }
        : null,
      free: !!d.is_free,
    });
  } catch {
    res.status(502).json({ error: "Steam didn't respond in time." });
  }
}
