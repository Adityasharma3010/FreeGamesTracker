// Lightweight, poll-friendly status check — ONLY personastate/gameid via
// GetPlayerSummaries for the signed-in user plus their friends (ids
// supplied by the client, already known from the one-time GetFriendList
// call in api/steam-profile.js). This exists so a page that's been open
// a while can refresh "online"/"in a game" without re-running the much
// heavier api/steam-profile.js (which walks achievements across several
// games — expensive to call every 30-60s).
const STEAM_API_KEY = process.env.STEAM_API_KEY;

export default async function handler(req, res) {
  if (!STEAM_API_KEY) {
    res.status(500).json({ error: "STEAM_API_KEY is not configured on the server." });
    return;
  }
  const { steamid, friendIds } = req.query;
  if (!steamid || !/^\d{17}$/.test(String(steamid))) {
    res.status(400).json({ error: "Provide a 17-digit ?steamid=" });
    return;
  }

  // GetPlayerSummaries takes up to 100 ids per call — own id + friends
  // fits comfortably (friend list is already capped at 12 elsewhere).
  const ids = [steamid, ...String(friendIds || "").split(",").filter((id) => /^\d{17}$/.test(id))];

  try {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${ids.join(",")}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!r.ok) {
      res.status(502).json({ error: `Steam responded ${r.status}` });
      return;
    }
    const json = await r.json();
    const players = json?.response?.players || [];

    // personastate: 0 Offline, 1 Online, 2 Busy, 3 Away, 4 Snooze,
    // 5 Looking to trade, 6 Looking to play — matches api/steam.js's own
    // mapping, since the profile page reads playerProfile.personaState
    // as one of these exact strings.
    const personaStates = { 0: "offline", 1: "online", 2: "busy", 3: "away", 4: "snooze", 5: "looking to trade", 6: "looking to play" };
    const toSelfStatus = (p) => ({
      personaState: personaStates[p.personastate] || "offline",
      inGame: p.gameextrainfo || null,
      inGameAppid: p.gameid ? Number(p.gameid) : null,
    });
    // Friends list (api/steam-profile.js) only ever needed a boolean —
    // matching that shape so the client can merge this response straight
    // into the existing friends array without reshaping it.
    const toFriendStatus = (p) => ({
      online: p.personastate > 0 || !!p.gameid,
      inGame: p.gameextrainfo || null,
    });

    const self = players.find((p) => p.steamid === steamid);
    const friends = {};
    players.forEach((p) => {
      if (p.steamid !== steamid) friends[p.steamid] = toFriendStatus(p);
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ self: self ? toSelfStatus(self) : null, friends });
  } catch {
    res.status(502).json({ error: "Steam didn't respond in time." });
  }
}