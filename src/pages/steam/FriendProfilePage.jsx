import React from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";
import SteamProfileView from "../../components/SteamProfileView.jsx";

// The FRIEND's profile. All data comes from FriendLayout via the outlet
// context (useSteamProfileData(steamid)) — never from useSteam(), which is
// the signed-in user's own account.
export default function FriendProfilePage() {
  const { theme } = useTheme();
  const { steamid } = useParams();
  const { steam, matches, matchAppIds } = useOutletContext();
  const base = `/steam/friend/${steamid}`;

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
      basePath={base}
      gamePath={(appid) => `${base}/game/${appid}`}
    />
  );
}
