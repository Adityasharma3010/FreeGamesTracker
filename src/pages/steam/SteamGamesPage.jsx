import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useSteam } from "../../context/SteamContext.jsx";
import { useSteamMatches } from "../../hooks/useSteamMatches.js";
import { useSteamListControls } from "../../hooks/useSteamListControls.js";
import SteamListControls, {
  ListSummary,
  NoMatches,
} from "../../components/SteamListControls.jsx";
import { GameTile, TileSkeleton } from "../../components/SteamConnect.jsx";
import { LuDownload, LuShuffle } from "react-icons/lu";
import PickAGame from "../../components/PickAGame.jsx";
import { pickRandomGame } from "../../lib/steamCompare.js";

// Builds a CSV client-side from data that's already loaded — no extra
// requests needed. Minimal RFC 4180 quoting (only fields that actually
// contain a comma/quote/newline get wrapped).
function toCsv(rows, headers) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(([, label]) => esc(label)).join(",")];
  rows.forEach((row) => {
    lines.push(headers.map(([key]) => esc(row[key])).join(","));
  });
  return lines.join("\n");
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// One page component for both /steam/wishlist and /steam/library —
// they're the same grid, just different data. Keyed by `kind` so the
// search/sort/filter choices reset when you switch tabs (React would
// otherwise reuse this instance and carry e.g. "Most played" over to the
// wishlist, where it doesn't exist).
export default function SteamGamesPage({ kind }) {
  return <SteamGamesPageInner key={kind} kind={kind} />;
}

function SteamGamesPageInner({ kind }) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const {
    status,
    error,
    wishlistGames,
    libraryGames,
    libraryPublic,
    playerProfile,
  } = useSteam();
  const { matchAppIds } = useSteamMatches();
  const isWishlist = kind === "wishlist";
  const games = isWishlist ? wishlistGames : libraryGames;

  // Cross-reference against the OTHER list the person already loaded —
  // no new API calls, just a lookup against data that's already there.
  const libraryAppids = useMemo(
    () => new Set(libraryGames.map((g) => g.appid)),
    [libraryGames],
  );
  const inGameAppid = playerProfile?.inGameAppid || null;

  const controls = useSteamListControls({
    games,
    kind,
    // Only the wishlist can be compared against what you already own, and
    // only wishlist items can be "free right now" giveaways.
    libraryAppids: isWishlist ? libraryAppids : null,
    matchAppIds: isWishlist ? matchAppIds : null,
  });

  // "Pick a game" (Library only). Picks from what's currently on screen,
  // so searching/filtering narrows the pool; among those it favours games
  // you've never played.
  const [pick, setPick] = useState(null);
  const handlePick = () =>
    setPick(pickRandomGame(controls.visible, { excludeAppid: pick?.appid }));

  if (status === "loading" || status === "idle") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <TileSkeleton key={i} index={i} />
        ))}
      </div>
    );
  }
  if (status === "error") {
    return (
      <p className="text-[13px]" style={{ color: theme.textDim }}>
        Couldn't load your data: {error}
      </p>
    );
  }

  if (games.length === 0) {
    let msg = isWishlist ? "Your wishlist is empty." : "No games found.";
    if (playerProfile && playerProfile.visibility !== "public") {
      msg = `Your Steam profile is set to ${playerProfile.visibility === "private" ? "private" : "friends-only"} — wishlist and library can't be read until it's public.`;
    } else if (libraryPublic === false) {
      msg =
        'Your profile is public, but "Game details" is private/friends-only in your Steam privacy settings — that\'s the specific toggle wishlist and library both need.';
    }
    return (
      <p className="text-[13px]" style={{ color: theme.textDim }}>
        {msg}
      </p>
    );
  }

  const handleExport = () => {
    const headers = isWishlist
      ? [
          ["appid", "App ID"],
          ["name", "Name"],
          ["ownedAlready", "Already owned"],
        ]
      : [
          ["appid", "App ID"],
          ["name", "Name"],
          ["playtimeHours", "Hours played"],
        ];
    const rows = games.map((g) =>
      isWishlist
        ? {
            appid: g.appid,
            name: g.name,
            ownedAlready: libraryAppids.has(g.appid) ? "yes" : "no",
          }
        : {
            appid: g.appid,
            name: g.name,
            playtimeHours: ((g.playtime || 0) / 60).toFixed(1),
          },
    );
    downloadCsv(`steam-${kind}.csv`, toCsv(rows, headers));
  };

  return (
    <div className="flex flex-col gap-3">
      <SteamListControls controls={controls} />
      <ListSummary controls={controls}>
        <div className="flex items-center gap-2">
          {!isWishlist && (
            <button
              type="button"
              onClick={handlePick}
              disabled={controls.visible.length === 0}
              className="tap-target flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border-2 cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                borderColor: "#e879f9",
                color: "#e879f9",
                background: "#e879f922",
              }}
            >
              <LuShuffle size={12} /> Pick a game
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="tap-target flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border cursor-pointer transition-colors duration-150 hover:bg-white/10"
            style={{ borderColor: theme.surfaceBorder, color: theme.textFaint }}
          >
            <LuDownload size={12} /> Export CSV
          </button>
        </div>
      </ListSummary>
      {!isWishlist && pick && (
        <PickAGame
          game={pick}
          theme={theme}
          onPickAnother={handlePick}
          onOpen={() => navigate(`/steam/game/${pick.appid}`)}
          onClose={() => setPick(null)}
        />
      )}
      {controls.visible.length === 0 && <NoMatches controls={controls} />}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {controls.visible.map((g, i) => {
          const badge = isWishlist
            ? libraryAppids.has(g.appid)
              ? { label: "Owned", color: "#2fb4ff" }
              : null
            : inGameAppid && g.appid === inGameAppid
              ? { label: "Playing", color: "#7dff70", pulse: true }
              : null;
          return (
            <GameTile
              key={g.appid}
              {...g}
              theme={theme}
              highlight={isWishlist && matchAppIds.has(g.appid)}
              badge={badge}
              index={i}
              onSelect={({ appid }) => navigate(`/steam/game/${appid}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
