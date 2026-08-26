// Only trust an EXACT Steam App ID pulled straight from the claim link's
// URL — never fuzzy-match by title. GamerPower's giveaway titles often
// don't match a game's real Steam name closely enough to compare safely
// ("World of Tanks 16th Anniversary Gift Pack" vs whatever the base game
// is actually called on Steam), and a false match here is worse than no
// match at all — same principle as the trial-news keyword matching.
export function extractSteamAppId(url) {
  if (!url) return null;
  const match = url.match(/store\.steampowered\.com\/app\/(\d+)/i);
  return match ? Number(match[1]) : null;
}
