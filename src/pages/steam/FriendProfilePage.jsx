import React from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";
import SteamProfileView from "../../components/SteamProfileView.jsx";

export default function FriendProfilePage() {
  const { steamid } = useParams();
  const { theme } = useTheme();
  const { steam, matches, matchAppIds } = useOutletContext();

  return (
    <SteamProfileView
      status={steam.status}
      error={steam.error}
      theme={theme}
      playerProfile={steam.playerProfile}
      equipped={steam.equipped}
      steamid={steam.steamid}
      wishlistGames={steam.wishlistGames}
      libraryGames={steam.libraryGames}
      matches={matches}
      matchAppIds={matchAppIds}
      basePath={`/steam/friend/${steamid}`}
      gamePath={(appid) => `/steam/friend/${steamid}/game/${appid}`}
      // No friendPath here — a friend-of-a-friend link would need this
      // page to go two levels deep in-app, which isn't worth it; their
      // friends list still just links out to Steam directly.
    />
  );
}
