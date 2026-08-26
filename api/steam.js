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

async function fetchLibrary(steamid) {
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamid}&include_appinfo=0&include_played_free_games=1&format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  // Steam returns an EMPTY response body (no "games" key) when the
  // profile's game details are private, rather than an explicit error —
  // that ambiguity is why we surface `profilePublic` separately below.
  const games = data?.response?.games;
  return {
    public: Array.isArray(games),
    appIds: Array.isArray(games) ? games.map((g) => g.appid) : [],
  };
}

async function fetchWishlist(steamid) {
  const appIds = [];
  let page = 0;
  // Paginated, ~1000 items/page historically — cap pages defensively
  // so a malformed response can't loop forever.
  for (let i = 0; i < 15; i++) {
    const url = `https://store.steampowered.com/wishlist/profiles/${steamid}/wishlistdata/?p=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "FreeGamesTrackerBot/1.0 (+https://github.com/Adityasharma3010/FreeGamesTracker)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) break;
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== "object" || Array.isArray(data)) break;
    const ids = Object.keys(data);
    if (ids.length === 0) break;
    appIds.push(...ids.map(Number));
    page++;
    if (ids.length < 1000) break; // last page
  }
  return appIds;
}

export default async function handler(req, res) {
  if (!STEAM_API_KEY) {
    res.status(500).json({ error: "STEAM_API_KEY is not configured on the server." });
    return;
  }

  const { steamid, vanity } = req.query;
  if (!steamid && !vanity) {
    res.status(400).json({ error: "Provide either ?steamid= (64-bit ID) or ?vanity= (custom URL name)." });
    return;
  }

  try {
    let id = steamid;
    if (!id && vanity) {
      id = await resolveVanityUrl(vanity);
      if (!id) {
        res.status(404).json({ error: "Couldn't resolve that Steam profile name. Double-check it, or use your SteamID64 instead." });
        return;
      }
    }

    const [library, wishlistAppIds] = await Promise.all([
      fetchLibrary(id),
      fetchWishlist(id).catch(() => []), // wishlist failing shouldn't sink library data
    ]);

    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=1800");
    res.status(200).json({
      steamid: id,
      libraryPublic: library.public,
      libraryAppIds: library.appIds,
      wishlistAppIds,
    });
  } catch (err) {
    res.status(502).json({ error: "Steam didn't respond — try again in a moment." });
  }
}
