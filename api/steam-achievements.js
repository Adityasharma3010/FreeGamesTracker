// GET /api/steam-achievements?steamid=X&appid=Y
//
// Called once, when someone opens a single game's detail page from their
// library — not for a whole grid, so there's no batching/rate-limit risk
// like the store-data endpoints had.
//
// Merges three calls:
//   1. GetSchemaForGame   — the achievement LIST for this game: names,
//      descriptions, and icon URLs. Same for every player. Most games
//      have none of this at all, which is normal, not an error.
//   2. GetPlayerAchievements — which of those THIS steamid has unlocked,
//      and when. Fails with success:false if their game stats are
//      private, even if their profile itself is public.
//   3. GetGlobalAchievementPercentagesForApp — what % of all players have
//      each one, for a simple rarity ("12.4% of players") — no API key
//      needed, and not tied to any one player.
//
// Same STEAM_API_KEY as api/steam.js (Settings → Environment Variables
// in the Vercel project). All 3 Steam calls run in parallel.

const STEAM_API_KEY = process.env.STEAM_API_KEY;

const STEAM_FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "FreeGamesTracker/1.0 (+https://github.com/Adityasharma3010/FreeGamesTracker)",
};

// The achievement LIST barely changes — cached for a day, same as other
// slow-moving Steam metadata in this project.
const SCHEMA_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const schemaCache = new Map(); // appid -> { fetchedAt, achievements[] | null }

const GLOBAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const globalCache = new Map(); // appid -> { fetchedAt, percentByName Map }

// A player's unlocked state changes as they play — short TTL, just
// enough that repeat visits to the same game in one sitting don't
// re-hit Steam every time.
const PLAYER_CACHE_TTL_MS = 5 * 60 * 1000;
const playerCache = new Map(); // "steamid:appid" -> { fetchedAt, result }

async function fetchJson(url) {
  const r = await fetch(url, {
    headers: STEAM_FETCH_HEADERS,
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error(`Steam responded ${r.status}`);
  return r.json();
}

// null = this game has no achievements at all (normal — most don't).
async function fetchSchema(appid) {
  const cached = schemaCache.get(appid);
  if (cached && Date.now() - cached.fetchedAt < SCHEMA_CACHE_TTL_MS) {
    return cached.achievements;
  }
  let achievements = null;
  try {
    const json = await fetchJson(
      `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${appid}&l=english`,
    );
    const list = json?.game?.availableGameStats?.achievements;
    if (Array.isArray(list) && list.length > 0) achievements = list;
  } catch {
    // Leave as null — schema fetch failures aren't cached, so the next
    // visit tries again instead of a transient error meaning "no
    // achievements" forever.
    return null;
  }
  schemaCache.set(appid, { fetchedAt: Date.now(), achievements });
  return achievements;
}

async function fetchGlobalPercentages(appid) {
  const cached = globalCache.get(appid);
  if (cached && Date.now() - cached.fetchedAt < GLOBAL_CACHE_TTL_MS) {
    return cached.percentByName;
  }
  const percentByName = new Map();
  try {
    const json = await fetchJson(
      `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appid}`,
    );
    const list = json?.achievementpercentages?.achievements;
    if (Array.isArray(list)) {
      for (const a of list) {
        if (!a?.name) continue;
        // Steam's own JSON returns this as a numeric STRING (e.g.
        // "45.6779"), not a number — .toFixed() on that crashes the
        // frontend, which is exactly what was happening. Coerced once,
        // here, so nothing downstream has to guess about the type.
        const pct = Number(a.percent);
        percentByName.set(a.name, Number.isFinite(pct) ? pct : null);
      }
    }
  } catch {
    /* rarity is a nice-to-have — fall through with an empty map */
  }
  globalCache.set(appid, { fetchedAt: Date.now(), percentByName });
  return percentByName;
}

// { ok: true, achieved: Map<name, unlocktime> } or
// { ok: false, reason: "private" | "error" }
async function fetchPlayerAchievements(steamid, appid) {
  const key = `${steamid}:${appid}`;
  const cached = playerCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < PLAYER_CACHE_TTL_MS) {
    return cached.result;
  }
  let result;
  try {
    const json = await fetchJson(
      `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${STEAM_API_KEY}&steamid=${steamid}&appid=${appid}&l=english`,
    );
    const stats = json?.playerstats;
    if (!stats?.success || !Array.isArray(stats.achievements)) {
      // Steam returns success:false with an error string ("Profile is
      // not public" / "Requested app has no stats") rather than an HTTP
      // error — both read as "can't show this", but the message helps
      // tell a private profile apart from a game with no achievements.
      result = {
        ok: false,
        reason: /private|not public/i.test(stats?.error || "")
          ? "private"
          : "error",
      };
    } else {
      const achieved = new Map();
      for (const a of stats.achievements) {
        if (a.achieved) achieved.set(a.apiname, a.unlocktime || 0);
      }
      result = { ok: true, achieved };
    }
  } catch {
    result = { ok: false, reason: "error" };
  }
  // A private/error result isn't cached — no reason to remember a
  // failure past this one request; a real one (even "0 unlocked") is.
  if (result.ok) playerCache.set(key, { fetchedAt: Date.now(), result });
  return result;
}

export default async function handler(req, res) {
  const { steamid, appid } = req.query;

  if (!appid || !/^\d+$/.test(String(appid))) {
    res.status(400).json({ error: "Provide a numeric ?appid=" });
    return;
  }
  if (!steamid || !/^\d+$/.test(String(steamid))) {
    res.status(400).json({ error: "Provide a numeric ?steamid=" });
    return;
  }
  if (!STEAM_API_KEY) {
    res
      .status(500)
      .json({ error: "STEAM_API_KEY is not configured on the server." });
    return;
  }

  const [schema, globalPercent, player] = await Promise.all([
    fetchSchema(appid),
    fetchGlobalPercentages(appid),
    fetchPlayerAchievements(steamid, appid),
  ]);

  if (!schema) {
    // Most games have no achievements at all — a normal, common
    // response, not an error the UI needs to explain.
    res.status(200).json({ found: false, achievements: [] });
    return;
  }

  if (!player.ok) {
    // The achievement LIST still exists and is real Steam data, even
    // though we can't say which ones this player has — sent through so
    // the page can show "achievements exist, but are private" rather
    // than nothing at all.
    res.status(200).json({
      found: true,
      locked: player.reason, // "private" | "error"
      total: schema.length,
      unlocked: 0,
      achievements: [],
    });
    return;
  }

  const achievements = schema.map((a) => {
    const unlocktime = player.achieved.get(a.name) || 0;
    return {
      apiname: a.name,
      name: a.displayName || a.name,
      description: a.description || null,
      hidden: !!a.hidden,
      icon: a.icon || null, // unlocked-state icon
      iconGray: a.icongray || null, // locked-state icon
      achieved: player.achieved.has(a.name),
      unlockTime: unlocktime, // unix seconds, 0 if locked
      globalPercent: globalPercent.get(a.name) ?? null,
    };
  });

  achievements.sort((a, b) => {
    if (a.achieved !== b.achieved) return a.achieved ? -1 : 1;
    if (a.achieved) return b.unlockTime - a.unlockTime; // most recent first
    // Locked: rarer-but-still-common first (closest within reach), then
    // whatever has no known rarity at the end.
    const ap = a.globalPercent ?? -1;
    const bp = b.globalPercent ?? -1;
    return bp - ap;
  });

  res.status(200).json({
    found: true,
    locked: null,
    total: achievements.length,
    unlocked: achievements.filter((a) => a.achieved).length,
    achievements,
  });
}
