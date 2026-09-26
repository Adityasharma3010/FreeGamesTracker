// "Profile extras" for the Steam profile page + nav avatar:
//   1. equipped cosmetics (avatar frame, animated avatar, profile
//      background) via IPlayerService/GetProfileItemsEquipped
//   2. Steam level via IPlayerService/GetSteamLevel
//   3. recently played games via IPlayerService/GetRecentlyPlayedGames
//   4. friends list via ISteamUser/GetFriendList + GetPlayerSummaries
//   5. a rarest-achievement showcase built from recently-played games,
//      via GetPlayerAchievements + GetSchemaForGame +
//      GetGlobalAchievementPercentagesForApp
//
// Each piece is fetched independently — if one fails the others still
// come back, and the frontend treats everything here as a "nice to have"
// (worst case: plain avatar, gradient background, fewer sections).
//
// Uses the same server-side STEAM_API_KEY as api/steam.js.

const STEAM_API_KEY = process.env.STEAM_API_KEY;

// Steam returns cosmetic asset paths RELATIVE (e.g. "items/1234/abcd.png").
// Absolute URLs are passed through untouched in case Valve changes that.
// Full-quality equipped-item art (backgrounds, frames, animated avatars,
// modifiers) lives on this mirror. The other Steam CDN
// (cdn.cloudflare.steamstatic.com/steamcommunity/public/images/) also
// resolves these paths but serves a lower-quality re-encode — that was
// the "background quality is bad" bug.
const CDN = "https://shared.fastly.steamstatic.com/community_assets/images/";
const abs = (p) => {
  if (!p || typeof p !== "string") return null;
  return /^https?:\/\//i.test(p) ? p : CDN + p.replace(/^\/+/, "");
};

// Steam's animated avatars and animated frames both follow the same
// pattern: image_small is the ANIMATED file (a GIF for avatars, an
// animated PNG for frames) while image_large is only a still of it.
// So for those two, `image` must be image_small. (You can't tell an APNG
// from a normal PNG by its file extension, which is why this is an
// explicit option rather than auto-detected.)
// Backgrounds are different: they're animated via movie_webm / movie_mp4.
// `staticImage` is always a still, used for reduced-motion users.
function slot(item, { animatedSmall = false } = {}) {
  if (!item || typeof item !== "object") return null;
  const small = abs(item.image_small);
  const large = abs(item.image_large);
  const staticImage = large || small;
  const image = animatedSmall && small ? small : staticImage;
  const webm = abs(item.movie_webm);
  const mp4 = abs(item.movie_mp4);
  if (!image && !webm && !mp4) return null;
  return {
    name: item.item_title || item.name || null,
    image,
    staticImage,
    webm,
    mp4,
    webmSmall: abs(item.movie_webm_small),
    mp4Small: abs(item.movie_mp4_small),
  };
}

async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Steam responded ${r.status}`);
  return r.json();
}

async function fetchEquipped(id) {
  const json = await getJson(
    `https://api.steampowered.com/IPlayerService/GetProfileItemsEquipped/v1/?key=${STEAM_API_KEY}&steamid=${id}`,
  );
  return json?.response || {};
}

async function fetchLevel(id) {
  const json = await getJson(
    `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${STEAM_API_KEY}&steamid=${id}`,
  );
  const lv = json?.response?.player_level;
  return typeof lv === "number" ? lv : null;
}

// Friends list is only visible if the user's Steam privacy setting for it
// is public — GetFriendList 401s otherwise, which fetchFriends below
// treats as "no friends to show" rather than a hard error.
async function fetchFriends(id) {
  const listJson = await getJson(
    `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${STEAM_API_KEY}&steamid=${id}&relationship=friend`,
  );
  const ids = (listJson?.friendslist?.friends || []).map((f) => f.steamid);
  if (ids.length === 0) return [];

  // GetPlayerSummaries takes up to 100 ids per call — cap at 12 friends
  // worth showing on a profile card, no need for more than one call.
  const sample = ids.slice(0, 12);
  const sumJson = await getJson(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${sample.join(",")}`,
  );
  const players = sumJson?.response?.players || [];
  return players.map((p) => ({
    steamid: p.steamid,
    name: p.personaname || "Steam user",
    avatar: p.avatarmedium || p.avatar || null,
    online: p.personastate > 0 || p.gameid, // 0 = offline; also count "in-game" as active
    inGame: p.gameextrainfo || null,
  }));
}

// Achievement showcase — built entirely from documented, public endpoints
// (no OAuth beyond the API key). Candidate games are whatever's in
// "recently played" (fetched below); for each, we pull the player's
// unlocked achievements, the schema for their display name/icon, and the
// global unlock percentage so the RAREST ones can be surfaced first —
// same idea as Steam's own "Rarest Achievement Showcase". A game with no
// achievements, or with achievement stats set to private, is skipped
// rather than treated as an error.

// Per-game schema and global percentages don't change often — worth
// caching across requests since the same games recur.
const schemaCache = new Map();
async function fetchSchema(appid) {
  if (schemaCache.has(appid)) return schemaCache.get(appid);
  const p = getJson(
    `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_API_KEY}&appid=${appid}&l=english`,
  )
    .then((json) => ({
      gameName: json?.game?.gameName || null,
      achievements: json?.game?.availableGameStats?.achievements || [],
    }))
    .catch(() => ({ gameName: null, achievements: [] }));
  schemaCache.set(appid, p);
  return p;
}

const percentCache = new Map();
async function fetchGlobalPercentages(appid) {
  if (percentCache.has(appid)) return percentCache.get(appid);
  const p = getJson(
    `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appid}`,
  )
    .then((json) => {
      const map = new Map();
      (json?.achievementpercentages?.achievements || []).forEach((a) => map.set(a.name, a.percent));
      return map;
    })
    .catch(() => new Map());
  percentCache.set(appid, p);
  return p;
}

async function fetchUnlockedForGame(id, appid) {
  // 400/403 here just means this game has no achievements, or the
  // player's stats are private — a normal outcome, not a real error.
  const json = await getJson(
    `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${STEAM_API_KEY}&steamid=${id}&appid=${appid}&l=english`,
  ).catch(() => null);
  const list = json?.playerstats?.achievements;
  if (!json?.playerstats?.success || !Array.isArray(list)) return [];
  return list.filter((a) => a.achieved === 1).map((a) => a.apiname);
}

async function fetchAchievementShowcase(id, candidateAppids) {
  const appids = [...new Set(candidateAppids)].slice(0, 6); // cap calls
  if (appids.length === 0) return [];

  const perGame = await Promise.all(
    appids.map(async (appid) => {
      const unlocked = await fetchUnlockedForGame(id, appid);
      if (unlocked.length === 0) return [];
      const [{ gameName, achievements: schema }, percents] = await Promise.all([
        fetchSchema(appid),
        fetchGlobalPercentages(appid),
      ]);
      return unlocked
        .map((apiname) => {
          const def = schema.find((a) => a.name === apiname);
          if (!def) return null;
          return {
            appid,
            apiname,
            gameName,
            name: def.displayName || apiname,
            description: def.description || null,
            icon: def.icon || null,
            percent: percents.has(apiname) ? percents.get(apiname) : null,
          };
        })
        .filter(Boolean);
    }),
  );

  return perGame
    .flat()
    .sort((a, b) => (a.percent ?? 100) - (b.percent ?? 100)) // rarest (lowest %) first; unknown % sorts last
    .slice(0, 6);
}

async function fetchRecent(id) {
  const json = await getJson(
    `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_API_KEY}&steamid=${id}&count=6`,
  );
  const games = json?.response?.games;
  if (!Array.isArray(games)) return [];
  return games.map((g) => ({
    appid: g.appid,
    name: g.name || `App ${g.appid}`,
    playtime2w: g.playtime_2weeks || 0, // minutes, last two weeks
    playtimeForever: g.playtime_forever || 0, // minutes, all-time
  }));
}

export default async function handler(req, res) {
  if (!STEAM_API_KEY) {
    res.status(500).json({ error: "STEAM_API_KEY is not configured on the server." });
    return;
  }
  const { steamid } = req.query;
  if (!steamid || !/^\d{17}$/.test(String(steamid))) {
    res.status(400).json({ error: "Provide a 17-digit ?steamid=" });
    return;
  }

  const [equippedR, levelR, recentR, friendsR] = await Promise.allSettled([
    fetchEquipped(steamid),
    fetchLevel(steamid),
    fetchRecent(steamid),
    fetchFriends(steamid),
  ]);

  const d = equippedR.status === "fulfilled" ? equippedR.value : {};
  const recentGames = recentR.status === "fulfilled" ? recentR.value : [];

  // Achievement candidates come from recently-played games — needs
  // recentGames to already be resolved, so this runs after the batch
  // above rather than inside it.
  const achievementsR = await fetchAchievementShowcase(
    steamid,
    recentGames.map((g) => g.appid),
  ).catch(() => []);

  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=1800");
  res.status(200).json({
    avatarFrame: slot(d.avatar_frame, { animatedSmall: true }),
    animatedAvatar: slot(d.animated_avatar, { animatedSmall: true }),
    background: slot(d.profile_background),
    miniBackground: slot(d.mini_profile_background),
    profileModifier: slot(d.profile_modifier),
    level: levelR.status === "fulfilled" ? levelR.value : null,
    friends: friendsR.status === "fulfilled" ? friendsR.value : [],
    recentGames,
    achievements: achievementsR,
  });
}