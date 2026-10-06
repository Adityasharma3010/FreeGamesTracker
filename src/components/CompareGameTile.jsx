import React, { useState } from "react";
import { LuTrophy } from "react-icons/lu";
import { SiSteam } from "react-icons/si";
import SteamGameImage from "./SteamGameImage.jsx";
import { formatHours } from "../lib/steamCompare.js";

// One game in the Compare page's lists. `stats` is who-has-how-many-hours:
//   []                                     (wishlist-only games)
//   [{ name, minutes, color }]             (one owner)
//   [{ name, minutes, color }, {...}]      (both players: left, right)
// `variant` picks the look: "split" (art + bar under it) | "overlay"
// (art fills the tile, hours as pills).

function Art({ appid, failed, onFailed }) {
  return failed ? (
    <div className="absolute inset-0 flex items-center justify-center">
      <SiSteam size={22} className="text-white/25" />
    </div>
  ) : (
    <SteamGameImage
      appid={appid}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      onAllFailed={onFailed}
    />
  );
}

function Trophy({ game, onAchievements, className }) {
  if (!onAchievements) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onAchievements(game);
      }}
      aria-label={`Compare achievements for ${game.name}`}
      title="Compare achievements"
      className={`tap-target z-10 flex items-center justify-center w-7 h-7 rounded cursor-pointer transition-colors duration-150 hover:bg-black ${className}`}
      style={{ background: "rgba(0,0,0,0.65)", color: "#e879f9" }}
    >
      <LuTrophy size={13} />
    </button>
  );
}

// Hours line(s) under a game: a two-colour tug-of-war bar when both
// players own it, a coloured "name · hours" line when only one does.
function StatLine({ stats }) {
  if (stats.length === 2) {
    const [x, y] = stats;
    const total = x.minutes + y.minutes;
    const lf = total > 0 ? x.minutes / total : 0.5;
    return (
      <div
        className="mt-1.5"
        title={`${x.name} ${formatHours(x.minutes)} · ${y.name} ${formatHours(y.minutes)}`}
      >
        <div className="flex items-baseline justify-between text-[11px] font-black tabular-nums">
          <span style={{ color: x.color }}>{formatHours(x.minutes)}</span>
          <span style={{ color: y.color }}>{formatHours(y.minutes)}</span>
        </div>
        <div className="flex h-1 gap-[2px] mt-1">
          <div
            style={{
              flexGrow: Math.max(lf, 0.001),
              flexBasis: 0,
              background: x.color,
            }}
          />
          <div
            style={{
              flexGrow: Math.max(1 - lf, 0.001),
              flexBasis: 0,
              background: y.color,
            }}
          />
        </div>
      </div>
    );
  }
  if (stats.length === 1) {
    const [x] = stats;
    return (
      <div
        className="mt-1 text-[11px] font-black truncate"
        style={{ color: x.color }}
      >
        {x.name} · {formatHours(x.minutes)}
      </div>
    );
  }
  return null;
}

export default function CompareGameTile({
  variant = "split",
  game,
  stats = [],
  theme,
  onSelect,
  onAchievements,
}) {
  const [failed, setFailed] = useState(false);
  const open = () => onSelect?.({ appid: game.appid, name: game.name });
  const art = (
    <Art appid={game.appid} failed={failed} onFailed={() => setFailed(true)} />
  );

  if (variant === "overlay") {
    return (
      <div
        className="group relative overflow-hidden border aspect-[460/215] transition duration-200 hover:-translate-y-0.5 hover:border-white/40 hover:shadow-[0_10px_28px_-10px_rgba(232,121,249,0.55)]"
        style={{ background: "#0b0e16", borderColor: theme.surfaceBorder }}
      >
        <button
          type="button"
          onClick={open}
          className="absolute inset-0 w-full text-left cursor-pointer"
        >
          {art}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,10,16,0.55) 0%, rgba(8,10,16,0) 38%, rgba(8,10,16,0.92) 100%)",
            }}
          />
          {stats.length > 0 && (
            <div className="absolute top-1.5 left-1.5 flex gap-1">
              {stats.map((s) => (
                <span
                  key={s.name}
                  title={`${s.name} ${formatHours(s.minutes)}`}
                  className="px-1.5 py-0.5 text-[10px] font-black"
                  style={{ background: s.color, color: "#06121c" }}
                >
                  {formatHours(s.minutes)}
                </span>
              ))}
            </div>
          )}
          <div
            className="absolute bottom-0 inset-x-0 px-2.5 py-2 text-[12px] font-black text-white truncate"
            title={game.name}
          >
            {game.name}
          </div>
        </button>
        <Trophy
          game={game}
          onAchievements={onAchievements}
          className="absolute top-1.5 right-1.5"
        />
      </div>
    );
  }

  // "split" (default): art, then name + a tug-of-war bar underneath.
  return (
    <div
      className="group relative border transition duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:shadow-[0_10px_28px_-12px_rgba(47,180,255,0.6)]"
      style={{ background: theme.surface, borderColor: theme.surfaceBorder }}
    >
      <button
        type="button"
        onClick={open}
        className="block w-full text-left cursor-pointer"
      >
        <div className="relative aspect-[460/215] overflow-hidden bg-white/5">
          {art}
        </div>
        <div className="px-2.5 py-2">
          <div
            className="text-[12px] font-bold truncate"
            style={{ color: theme.text }}
            title={game.name}
          >
            {game.name}
          </div>
          <StatLine stats={stats} />
        </div>
      </button>
      <Trophy
        game={game}
        onAchievements={onAchievements}
        className="absolute top-1.5 right-1.5"
      />
    </div>
  );
}
