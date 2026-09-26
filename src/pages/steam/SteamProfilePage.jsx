import React from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useSteam } from "../../context/SteamContext.jsx";
import { useSteamMatches } from "../../hooks/useSteamMatches.js";
import SteamProfileView from "../../components/SteamProfileView.jsx";

export default function SteamProfilePage() {
  const { theme } = useTheme();
  const steam = useSteam();
  const { matches, matchAppIds } = useSteamMatches();

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
      basePath="/steam"
      gamePath={(appid) => `/steam/game/${appid}`}
      friendPath={(friendSteamid) => `/steam/friend/${friendSteamid}`}
    />
  );
}
