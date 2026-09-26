import { useSteam } from "../context/SteamContext.jsx";
import { useMatchesFor } from "./useMatchesFor.js";

// Wishlist games that are in the current GamerPower giveaway list —
// same logic the old modal's "Matches" tab used, now shared by the nav
// menu badge and the Matches page. Thin wrapper around useMatchesFor,
// bound to YOUR OWN connected profile.
export function useSteamMatches() {
  const { connected, status, wishlistGames } = useSteam();
  return useMatchesFor(wishlistGames, connected && status === "success");
}