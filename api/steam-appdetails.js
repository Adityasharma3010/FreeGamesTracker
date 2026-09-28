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

/* -------------------------------------------------------------------------- */
/* StoreBrowse fallback                                                      */
/* -------------------------------------------------------------------------- */
// store.steampowered.com/api/appdetails is an old, undocumented endpoint
// with heavy bot-protection, and it going down for a stretch of games
// (Batman included) with no code change on our side points at Steam
// tightening that up, not at anything in our request. api.steampowered.com
// /IStoreBrowseService/GetItems is the modern, official endpoint the real
// Steam store website itself uses, hosted on a different domain — it
// already worked reliably for images (api/steam-image.js), and it can
// also return screenshots, trailers, description, and reviews. Used here
// as a full fallback whenever appdetails fails, instead of just giving up.
const STEAM_CDN = "https://shared.akamai.steamstatic.com/store_item_assets/";
const storeBrowseCache = new Map(); // "appid:cc" -> { fetchedAt, item }

function buildAssetUrl(urlFormat, filename) {
  const format = String(urlFormat || "").trim();
  const file = String(filename || "").trim();
  if (!format || !file || !format.includes("${FILENAME}")) return null;
  const substituted = format.replace("${FILENAME}", file);
  // Images (assets.asset_url_format) are a bare relative path that needs
  // our image CDN prefix — confirmed working (this is exactly how library
  // header art already loads). Trailers (trailer.trailer_url_format) are
  // a SEPARATE field pointing at Steam's video CDN, not the image one,
  // and it comes back as an already-complete URL — prefixing it too was
  // turning a real, working video link into garbage, which is why
  // thumbnails (built the same way, but coincidentally still resolvable
  // as an image path) showed up while every actual video 404'd.
  return substituted.includes("://")
    ? substituted
    : `${STEAM_CDN}${substituted}`;
}

// Screenshot filenames are a bare CDN path with no size baked in — Steam's
// own store site appends one of a few known size suffixes to get an
// actual file.
function buildScreenshotUrls(filename) {
  const file = String(filename || "").trim();
  if (!file) return null;
  return {
    thumb: `${STEAM_CDN}${file}.600x338.jpg`,
    full: `${STEAM_CDN}${file}.1920x1080.jpg`,
  };
}

// Verifies a candidate video URL actually resolves before it's ever sent
// to the browser, since the player showing "this trailer can't play
// here" is a dead end for the user — better to just leave a broken
// candidate out of the list entirely (falls through to whatever other
// candidate/trailer *does* work, or to "Watch on Steam" only as a true
// last resort). Browser-side this would need CORS Steam doesn't grant;
// server-side there's no such restriction. HEAD first (cheapest); some
// CDNs 405 on HEAD, so a 1-byte ranged GET is the fallback.
async function verifiedVideoUrl(url) {
  if (!url) return null;
  // Steam's video CDN enforces hotlink protection that images don't —
  // without a Referer/Origin claiming to be store.steampowered.com, it
  // was rejecting every request THIS server made to verify a URL, which
  // silently zeroed out every trailer (they were correct, they just
  // never passed our own check). A real browser loading the page
  // wouldn't hit this, since its Referer is already the deployed site,
  // but a server-to-server verification call needs to fake one.
  const videoHeaders = {
    ...STEAM_FETCH_HEADERS,
    Referer: "https://store.steampowered.com/",
    Origin: "https://store.steampowered.com",
  };
  try {
    const head = await fetch(url, {
      method: "HEAD",
      headers: videoHeaders,
      signal: AbortSignal.timeout(5000),
    });
    if (head.ok) return url;
  } catch {
    /* fall through to ranged GET */
  }
  try {
    const ranged = await fetch(url, {
      headers: { ...videoHeaders, Range: "bytes=0-0" },
      signal: AbortSignal.timeout(5000),
    });
    return ranged.ok ? url : null;
  } catch {
    return null;
  }
}

async function fetchStoreBrowseRaw(appid, cc) {
  const input = {
    ids: [{ appid: Number(appid) }],
    context: {
      language: "english",
      country_code: cc.toUpperCase(),
      steam_realm: 1,
    },
    data_request: {
      include_assets: true,
      include_screenshots: true,
      include_trailers: true,
      include_basic_info: true,
      include_reviews: true,
      include_all_purchase_options: true,
    },
  };
  const url =
    "https://api.steampowered.com/IStoreBrowseService/GetItems/v1/" +
    `?input_json=${encodeURIComponent(JSON.stringify(input))}`;
  const r = await fetch(url, {
    headers: STEAM_FETCH_HEADERS,
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error(`Steam GetItems returned ${r.status}`);
  const json = await r.json();
  const item = json?.response?.store_items?.[0];
  if (!item || item.visible === false) return null;
  return item;
}

async function fetchStoreBrowseCached(appid, cc) {
  const key = `${appid}:${cc}`;
  const cached = storeBrowseCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS)
    return cached.item;
  let item = null;
  try {
    item = await fetchStoreBrowseRaw(appid, cc);
  } catch {
    return null; // not cached — a transient failure should be retried next time
  }
  if (item) storeBrowseCache.set(key, { fetchedAt: Date.now(), item });
  return item;
}

// Steam Video CDN URLs go through /api/steam-video-proxy instead of
// being handed to the browser directly — the CDN's hotlink protection
// accepts our own server's faked Referer (used to verify them above) but
// will reject the real browser's own referrer, which is what "this
// trailer can't play here" actually was.
function proxied(url) {
  return url ? `/api/steam-video-proxy?url=${encodeURIComponent(url)}` : null;
}

async function mapStoreItemToDetails(item) {
  // Steam's own store page shows screenshots in their `ordinal` order,
  // not necessarily the order the API happens to list them in.
  const screenshots = [...(item.screenshots?.all_ages_screenshots || [])]
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    .slice(0, 12)
    .map((s) => buildScreenshotUrls(s.filename))
    .filter(Boolean);

  // Highlighted trailers first, then the rest — capped generously so a
  // game with several videos isn't cut down to three.
  const trailers = [
    ...(item.trailers?.highlights || []),
    ...(item.trailers?.other_trailers || []),
  ].slice(0, 10);

  const moviesRaw = await Promise.all(
    trailers.map(async (t, i) => {
      const tf = t.trailer_url_format;
      // Every quality tier is pooled into one candidate list rather than
      // trying to pick "the" mp4/webm — the player doesn't care which
      // slot a URL is in, it just tries src values in order and falls
      // through on error, so what matters is having real, VERIFIED
      // candidates rather than correctly-labeled ones.
      const allSources = [
        ...(t.trailer_max || []),
        ...(t.trailer_480p || []),
        ...(t.microtrailer || []),
      ];
      const candidates = [
        ...new Set(
          allSources.map((s) => buildAssetUrl(tf, s?.filename)).filter(Boolean),
        ),
      ];
      const verified = (
        await Promise.all(candidates.map(verifiedVideoUrl))
      ).filter(Boolean);
      // If verification couldn't confirm anything — including if the
      // Referer/Origin fix above still isn't the complete picture for
      // some edge case — fall back to the best raw candidate rather than
      // showing nothing at all. A real browser might still play it even
      // if this server's own check couldn't confirm it.
      const playable = verified.length > 0 ? verified : candidates.slice(0, 1);
      return {
        id: t.trailer_base_id ?? i,
        name: t.trailer_name || null,
        thumbnail: proxied(buildAssetUrl(tf, t.screenshot_medium)),
        mp4: proxied(playable[0]),
        webm: proxied(playable[1]),
        hls: null,
      };
    }),
  );
  const movies = moviesRaw.filter((m) => m.mp4 || m.webm);

  const bpo = item.best_purchase_option;
  const price = bpo
    ? {
        final: bpo.final_price_in_cents / 100,
        initial:
          (bpo.original_price_in_cents ?? bpo.final_price_in_cents) / 100,
        discountPercent: bpo.discount_pct || 0,
        currency: null, // formatted_final_price/formatted_original_price already carry the symbol
        formattedFinal: bpo.formatted_final_price || null,
        formattedInitial: bpo.formatted_original_price || null,
      }
    : null;

  const rs = item.reviews?.summary_filtered;
  const reviews = rs?.review_count
    ? {
        description: rs.review_score_label || null,
        totalPositive: Math.round(
          (rs.percent_positive / 100) * rs.review_count,
        ),
        totalReviews: rs.review_count,
        percentPositive: rs.percent_positive,
      }
    : null;

  return {
    found: true,
    description: item.basic_info?.short_description || null,
    screenshots,
    movies,
    movie: movies[0]
      ? { thumbnail: movies[0].thumbnail, mp4: movies[0].mp4 }
      : null,
    // StoreBrowse's genre-like data is tag IDs, not plain names, so this
    // path can't fill genres in without a separate tag-name lookup.
    genres: [],
    dlc: [],
    price,
    free: !!item.is_free,
    storeBrowseReviews: reviews, // used as a fallback if fetchReviewSummary also came up empty
  };
}

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
      // appdetails failed — try StoreBrowse (a different Steam domain/
      // endpoint) before giving up, since it's often unaffected when
      // appdetails specifically is having a bad day.
      const storeItem = await fetchStoreBrowseCached(appid, cc);
      if (storeItem) {
        const mapped = await mapStoreItemToDetails(storeItem);
        const { storeBrowseReviews, ...payload } = mapped;
        res.status(200).json({
          ...payload,
          news: await newsPromise,
          playerCount: await playerCountPromise,
          reviews: (await reviewsPromise) || storeBrowseReviews,
        });
        return;
      }

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
      ? [...d.movies]
          // Steam's "top two" trailers are the highlighted ones — put those
          // first so they're the two shown ahead of the screenshots.
          .sort((a, b) => (b.highlight ? 1 : 0) - (a.highlight ? 1 : 0))
          .slice(0, 10)
          .map((m) => ({
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
