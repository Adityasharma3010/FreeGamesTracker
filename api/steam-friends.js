// GET /api/steam-friends?steamid=X
//
// A full-ish friends list for picking who to compare with — separate
// from the 12-friend showcase in api/steam-profile.js, which is
// intentionally capped for a small "on your profile" preview. This one
// is for actually finding someone in a longer list, so it goes up to
// 100 (GetPlayerSummaries' own per-call limit) rather than 12.
//
// Same STEAM_API_KEY as api/steam.js and api/steam-profile.js.

const STEAM_API_KEY = process.env.STEAM_API_KEY;

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map(); // steamid -> { fetchedAt, result }

async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!r.ok) {
    const err = new Error(`Steam responded ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

// { public: true, friends: [...] } or { public: false, friends: [] } if
// the account's friends-list privacy is anything but fully public
// (GetFriendList 401s in that case — a normal, common setting, not an
// error to surface as one).
async function fetchFriends(steamid) {
  let listJson;
  try {
    listJson = await getJson(
      `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${STEAM_API_KEY}&steamid=${steamid}&relationship=friend`,
    );
  } catch (e) {
    if (e.status === 401) return { public: false, friends: [] };
    throw e;
  }

  const ids = (listJson?.friendslist?.friends || []).map((f) => f.steamid);
  if (ids.length === 0) return { public: true, friends: [] };

  // One call per 100 — plenty for the overwhelming majority of accounts,
  // and still just 1-2 calls even for someone with several hundred.
  const chunks = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));

  const results = await Promise.all(
    chunks.map((chunk) =>
      getJson(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${chunk.join(",")}`,
      ).catch(() => ({ response: { players: [] } })),
    ),
  );

  const friends = results
    .flatMap((r) => r?.response?.players || [])
    .map((p) => ({
      steamid: p.steamid,
      name: p.personaname || "Steam user",
      avatar: p.avatarmedium || p.avatar || null,
      online: p.personastate > 0 || !!p.gameid,
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

  return { public: true, friends };
}

export default async function handler(req, res) {
  const { steamid } = req.query;

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

  const cached = cache.get(steamid);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    res.status(200).json(cached.result);
    return;
  }

  try {
    const result = await fetchFriends(steamid);
    cache.set(steamid, { fetchedAt: Date.now(), result });
    res.status(200).json(result);
  } catch {
    res.status(502).json({ error: "Could not load friends from Steam." });
  }
}
