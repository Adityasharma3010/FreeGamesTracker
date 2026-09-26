import { useMemo } from "react";
import { useGiveaways } from "./useGiveaways.js";
import { extractSteamAppId } from "../lib/steamMatch.js";

// The actual matching logic behind useSteamMatches — pulled out so it can
// run against ANY wishlist (your own, or a friend's you're viewing),
// not just the one tied to the connected SteamContext.
export function useMatchesFor(wishlistGames, ready) {
  const { giveaways } = useGiveaways();

  return useMemo(() => {
    if (!ready) return { matches: [], matchAppIds: new Set() };
    const wishlistSet = new Set((wishlistGames || []).map((g) => g.appid));
    const matches = giveaways.filter((g) => wishlistSet.has(extractSteamAppId(g.open_giveaway_url || g.gamerpower_url)));
    const matchAppIds = new Set(matches.map((g) => extractSteamAppId(g.open_giveaway_url || g.gamerpower_url)));
    return { matches, matchAppIds };
  }, [ready, giveaways, wishlistGames]);
}