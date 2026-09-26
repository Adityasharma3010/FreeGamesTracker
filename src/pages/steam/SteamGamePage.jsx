import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useSteam } from "../../context/SteamContext.jsx";
import { useSteamMatches } from "../../hooks/useSteamMatches.js";
import GameDetailView from "../../components/GameDetailView.jsx";

function GamePageSkeleton({ theme }) {
  return (
    <div
      className="max-w-3xl mx-auto flex flex-col gap-3"
      aria-label="Loading game"
      role="status"
    >
      <div
        className="h-3 w-16 rounded motion-safe:animate-pulse"
        style={{ background: theme.chipBg }}
      />
      <div
        className="w-full aspect-[460/215] motion-safe:animate-pulse"
        style={{ background: theme.chipBg }}
      />
      <div
        className="h-5 w-2/3 rounded motion-safe:animate-pulse"
        style={{ background: theme.chipBg }}
      />
      <div
        className="h-3 w-24 rounded motion-safe:animate-pulse"
        style={{ background: theme.chipBg }}
      />
    </div>
  );
}

export default function SteamGamePage() {
  const { appid } = useParams();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { status, wishlistGames, libraryGames } = useSteam();
  const { matchAppIds } = useSteamMatches();
  const id = Number(appid);

  // Was `return null` here — a real blank screen while wishlist/library
  // are still loading (e.g. right after connecting), not just a bare
  // "waiting for the name" state.
  if (status === "loading" || status === "idle")
    return <GamePageSkeleton theme={theme} />;

  const game = [...wishlistGames, ...libraryGames].find(
    (g) => g.appid === id,
  ) || { appid: id, name: `App ${id}` };

  return (
    <div className="max-w-3xl mx-auto">
      <GameDetailView
        game={game}
        theme={theme}
        highlight={matchAppIds.has(id)}
        onBack={() =>
          window.history.length > 1 ? navigate(-1) : navigate("/steam/library")
        }
      />
    </div>
  );
}
