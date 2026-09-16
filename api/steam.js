// Runs server-side on Vercel — same CORS-avoidance pattern as
// api/trial-news.js. Needs a Steam Web API key set as the STEAM_API_KEY
// environment variable in the Vercel project (Settings → Environment
// Variables). Get one free at https://steamcommunity.com/dev/apikey —
// this key is never sent to the browser, it only lives here server-side.
//
// Two honesty caveats worth keeping in mind (see README):
// 1. GetOwnedGames (library) is Valve's official, documented API.
// 2. The wishlist endpoint used below is UNOFFICIAL — Valve doesn't
//    publish a real wishlist API. It's the same endpoint many
//    community tools quietly rely on, but it could change or break
//    without notice. Wrapped in its own try/catch so a wishlist failure
//    never takes down the library data too.

const STEAM_API_KEY = process.env.STEAM_API_KEY;

async function resolveVanityUrl(vanity) {
  const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(vanity)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data?.response?.success === 1) return data.response.steamid;
  return null;
}

// GetPlayerSummaries — official, documented Steam Web API. Gives us the
// real display name, avatar, and (critically) `communityvisibilitystate`,
// which tells us whether the profile itself is public/friends/private —
// distinct from, and more reliable than, inferring visibility indirectly
// from whether GetOwnedGames happened to return an empty games array.
async function fetchProfile(steamid) {
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamid}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  const p = data?.response?.players?.[0];
  if (!p) return null;

  // 1 = Private, 2 = Friends Only, 3 = Public (Valve's own enum values)
  const visibility = { 1: "private", 2: "friendsonly", 3: "public" }[p.communityvisibilitystate] || "unknown";

  return {
    personaname: p.personaname || null,
    avatar: p.avatarfull || p.avatarmedium || p.avatar || null,
    profileUrl: p.profileurl || `https://steamcommunity.com/profiles/${steamid}`,
    visibility,
  };
}

async function fetchLibrary(steamid) {
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamid}&include_appinfo=1&include_played_free_games=1&format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  // Steam returns an EMPTY response body (no "games" key) when the
  // profile's game details are private, rather than an explicit error —
  // that ambiguity is why we surface `profilePublic` separately below.
  const games = data?.response?.games;
  return {
    public: Array.isArray(games),
    games: Array.isArray(games)
      ? games
          .map((g) => ({
            appid: g.appid,
            name: g.name || `App ${g.appid}`,
            icon: g.img_icon_url
              ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
              : null,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [],
  };
}

// Steam's newer wishlist endpoint (see fetchWishlist below) only returns
// App IDs + priority, no names. GetAppList returns a name for every
// game on Steam in ONE request — better than calling the Store's
// appdetails endpoint once per wishlist item, which has fairly strict
// rate limits (historically ~200 requests/5min) and would mean 100+
// calls for a large wishlist, easily blowing past a serverless
// function's execution timeout.
//
// SteamDB doesn't re-fetch this live per request at all — it runs its
// own persistent, continuously-updated database. We don't have a
// database here, so we can't replicate that exactly, but this gets a
// real chunk of the same benefit cheaply: the list is cached in this
// module's memory, which Vercel keeps alive across requests as long as
// the underlying function instance stays "warm" (common for
// back-to-back requests; resets on a cold start). That means only the
// occasional request pays the cost of the ~100k-entry fetch — every
// other request, including from completely different users with
// different wishlists, reuses the same cached list instantly instead of
// re-fetching it. Not as durable as a real database-backed cache would
// be, but a meaningful step up from "no caching at all" without needing
// any new infrastructure (Vercel KV, a real DB, etc).
let appListCache = null; // { fetchedAt, map: Map<appid, name> }
const APP_LIST_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let lastAppListDebug = "not-attempted-yet";

async function fetchAppNames(appids) {
  const fresh = appListCache && Date.now() - appListCache.fetchedAt < APP_LIST_TTL_MS;
  if (!fresh) {
    try {
      // ISteamApps/GetAppList/v2 (used previously) is officially
      // deprecated by Valve — confirmed by hitting it directly and
      // getting a 404 "Method 'GetAppList' not found in interface
      // 'ISteamApps'". Valve's own docs point to IStoreService/GetAppList
      // as the replacement. It needs the API key (which we already have)
      // and returns results in pages rather than all at once, so this
      // loops through pages using the cursor Valve returns
      // (last_appid/have_more_results) until there's nothing more left,
      // capped defensively so a malformed response can't loop forever.
      const map = new Map();
      let lastAppid = 0;
      let pages = 0;
      let ok = true;
      while (pages < 6) {
        const url = `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${STEAM_API_KEY}&max_results=50000&last_appid=${lastAppid}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
        if (!res.ok) {
          ok = false;
          lastAppListDebug = `http-${res.status}`;
          break;
        }
        const data = await res.json();
        const apps = data?.response?.apps;
        if (!Array.isArray(apps) || apps.length === 0) break;
        for (const a of apps) map.set(a.appid, a.name);
        pages++;
        if (!data.response.have_more_results) break;
        lastAppid = data.response.last_appid;
      }
      if (ok && map.size > 0) {
        appListCache = { fetchedAt: Date.now(), map };
        lastAppListDebug = `fresh-fetch-ok-${map.size}-apps-${pages}-pages`;
      } else if (ok) {
        lastAppListDebug = "unexpected-shape";
      }
    } catch (err) {
      lastAppListDebug = `error-${err?.name || "unknown"}`;
      /* if this fails and we have no cache at all, fall through below
         and just return an empty map — names fall back to "App <id>" */
    }
  } else {
    lastAppListDebug = "cache-hit";
  }
  if (!appListCache) return new Map();
  const wanted = new Set(appids);
  const result = new Map();
  for (const id of wanted) {
    if (appListCache.map.has(id)) result.set(id, appListCache.map.get(id));
  }
  return result;
}

async function fetchWishlist(steamid) {
  // Valve's newer, more reliable wishlist endpoint. The old
  // store.steampowered.com/wishlist/.../wishlistdata/ JSON endpoint
  // (still used as a fallback below) has become unreliable/broken for
  // many accounts — this was the actual cause of wishlists showing
  // empty even on fully public profiles. This endpoint returns App IDs
  // and priority, but NOT names or images the way the old one did —
  // GameTile already pulls real box art from Steam's CDN by App ID
  // regardless, so visuals are unaffected; only the text label falls
  // back to "App <id>" until a proper name lookup is added.
  try {
    const url = `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?key=${STEAM_API_KEY}&steamid=${steamid}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const items = data?.response?.items;
      if (Array.isArray(items) && items.length > 0) {
        const nameMap = await fetchAppNames(items.map((it) => it.appid));
        return {
          source: "official",
          games: items
            .map((it) => ({
              appid: it.appid,
              name: nameMap.get(it.appid) || `App ${it.appid}`,
              icon: null,
              priority: typeof it.priority === "number" ? it.priority : 9999,
            }))
            .sort((a, b) => a.priority - b.priority),
        };
      }
      // Request succeeded but genuinely had 0 items, or an unexpected
      // shape — either way, fall through and try the legacy endpoint
      // too rather than assume "0 items" is definitely correct.
    }
  } catch {
    /* fall through to the legacy endpoint below */
  }

  // Legacy fallback — kept in case the new endpoint ever fails for a
  // given account. When it works, it conveniently includes real names
  // and images, which the new endpoint doesn't provide.
  const games = [];
  let page = 0;
  for (let i = 0; i < 15; i++) {
    const url = `https://store.steampowered.com/wishlist/profiles/${steamid}/wishlistdata/?p=${page}&v=23`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "FreeGamesTrackerBot/1.0 (+https://github.com/Adityasharma3010/FreeGamesTracker)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) break;
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== "object" || Array.isArray(data)) break;
    const entries = Object.entries(data);
    if (entries.length === 0) break;
    for (const [appid, info] of entries) {
      games.push({
        appid: Number(appid),
        name: info?.name || `App ${appid}`,
        icon: info?.capsule || null,
        priority: typeof info?.priority === "number" ? info.priority : 9999,
      });
    }
    page++;
    if (entries.length < 1000) break; // last page
  }
  return { source: games.length > 0 ? "legacy" : "both-empty", games: games.sort((a, b) => a.priority - b.priority) };
}

export default async function handler(req, res) {
  if (!STEAM_API_KEY) {
    res
      .status(500)
      .json({ error: "STEAM_API_KEY is not configured on the server." });
    return;
  }

  const { steamid, vanity } = req.query;
  if (!steamid && !vanity) {
    res
      .status(400)
      .json({
        error:
          "Provide either ?steamid= (64-bit ID) or ?vanity= (custom URL name).",
      });
    return;
  }

  try {
    let id = steamid;
    if (!id && vanity) {
      id = await resolveVanityUrl(vanity);
      if (!id) {
        res
          .status(404)
          .json({
            error:
              "Couldn't resolve that Steam profile name. Double-check it, or use your SteamID64 instead.",
          });
        return;
      }
    }

    const [profile, library, wishlist] = await Promise.all([
      fetchProfile(id).catch(() => null), // profile failing shouldn't sink the rest
      fetchLibrary(id),
      fetchWishlist(id).catch(() => ({ source: "error", games: [] })), // wishlist failing shouldn't sink library data
    ]);

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=1800",
    );
    res.status(200).json({
      steamid: id,
      profile,
      libraryPublic: library.public,
      libraryGames: library.games,
      wishlistGames: wishlist.games,
      wishlistSource: wishlist.source, // "official" | "legacy" | "both-empty" | "error" — debug field, see README
      appListDebug: lastAppListDebug, // debug field — remove once name lookup is confirmed working
    });
  } catch (err) {
    res
      .status(502)
      .json({ error: "Steam didn't respond — try again in a moment." });
  }
}
