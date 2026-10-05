import React, { useEffect, useId, useMemo, useState } from "react";
import { computeLibraryStats } from "../lib/steamLibraryStats.js";
import { formatHours } from "../lib/steamCompare.js";
import {
  computeHighlights,
  computeMatchScore,
  matchLabel,
} from "../lib/steamCompareInsights.js";

const RING = 96;
const STROKE = 8;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function Side({ player, theme, align }) {
  const stats = useMemo(
    () => (player.libraryHidden ? null : computeLibraryStats(player.library)),
    [player.library, player.libraryHidden],
  );
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-0 text-center">
      <div className="relative">
        {player.avatar ? (
          <img
            src={player.avatar}
            alt=""
            className="w-14 h-14 sm:w-20 sm:h-20 object-cover border-2"
            style={{ borderColor: align === "left" ? "#2fb4ff" : "#e879f9" }}
          />
        ) : (
          <div
            className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center text-2xl font-black border-2"
            style={{
              borderColor: align === "left" ? "#2fb4ff" : "#e879f9",
              background: theme.chipBg,
              color: theme.text,
            }}
          >
            {(player.name || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        {typeof player.level === "number" && (
          <span
            className="absolute -bottom-2 -right-2 min-w-[22px] h-[22px] px-1 flex items-center justify-center text-[10px] font-black rounded-full border-2"
            style={{
              background: "#0b0e16",
              borderColor: "#2fb4ff",
              color: "#fff",
            }}
            title={`Steam level ${player.level}`}
          >
            {player.level}
          </span>
        )}
      </div>
      <span
        className="max-w-full truncate text-[13px] sm:text-[15px] font-black mt-1"
        style={{ color: theme.text }}
      >
        {player.name}
      </span>
      <span
        className="text-[10.5px] sm:text-[11px]"
        style={{ color: theme.textDim }}
      >
        {stats
          ? `${stats.total.toLocaleString("en-US")} games · ${Math.round(stats.totalHours).toLocaleString("en-US")}h`
          : "Library private"}
      </span>
    </div>
  );
}

function ScoreRing({ score, theme }) {
  const gid = "ring" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 50);
    return () => clearTimeout(t);
  }, []);
  const offset = CIRC * (1 - (shown ? score : 0) / 100);

  return (
    <div className="relative shrink-0" style={{ width: RING, height: RING }}>
      <svg width={RING} height={RING} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2fb4ff" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        <circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          fill="none"
          stroke={theme.chipBg}
          strokeWidth={STROKE}
        />
        <circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[24px] font-black leading-none"
          style={{ color: theme.text }}
        >
          {score}%
        </span>
        <span
          className="text-[9px] font-black uppercase tracking-wide mt-0.5"
          style={{ color: theme.textFaint }}
        >
          match
        </span>
      </div>
    </div>
  );
}

function Chip({ label, value, sub, theme }) {
  return (
    <div
      className="flex-1 min-w-[150px] px-3 py-2 border"
      style={{ background: theme.surface, borderColor: theme.surfaceBorder }}
    >
      <div
        className="text-[10px] font-black uppercase tracking-wide"
        style={{ color: theme.textFaint }}
      >
        {label}
      </div>
      <div
        className="text-[13px] font-black truncate"
        style={{ color: theme.text }}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] truncate" style={{ color: theme.textDim }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// "Versus" header for the Compare page: both players, a match ring, and
// a few highlight chips. `me` / `them` are the same player objects
// CompareView gets, plus optional { avatar, level }.
export default function CompareHero({ me, them, both, theme, selfMode }) {
  const bothLibraries = !me.libraryHidden && !them.libraryHidden;
  const shared = both.length;
  const score = bothLibraries
    ? computeMatchScore({
        shared,
        myCount: me.library.length,
        theirCount: them.library.length,
      })
    : null;
  const highlights = useMemo(
    () => (bothLibraries ? computeHighlights(both) : null),
    [both, bothLibraries],
  );
  const a = selfMode ? "You" : me.name;
  const b = them.name;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6 px-3 sm:px-6 py-5 border"
        style={{
          borderColor: theme.surfaceBorder,
          background:
            "linear-gradient(135deg, rgba(47,180,255,0.14), rgba(232,121,249,0.14))",
        }}
      >
        <Side player={me} theme={theme} align="left" />
        <div className="flex flex-col items-center gap-1.5">
          {score != null ? (
            <>
              <ScoreRing score={score} theme={theme} />
              <span
                className="text-[11px] font-black uppercase tracking-wide text-center"
                style={{ color: "#e879f9" }}
              >
                {matchLabel(score)}
              </span>
              <span className="text-[11px]" style={{ color: theme.textDim }}>
                {shared} game{shared === 1 ? "" : "s"} in common
              </span>
            </>
          ) : (
            <span
              className="text-[22px] font-black"
              style={{ color: theme.textFaint }}
            >
              VS
            </span>
          )}
        </div>
        <Side player={them} theme={theme} align="right" />
      </div>

      {highlights && (
        <div className="flex flex-wrap gap-2">
          {highlights.biggestGap && (
            <Chip
              theme={theme}
              label="Biggest gap"
              value={highlights.biggestGap.name}
              sub={`${a} ${formatHours(highlights.biggestGap.myPlaytime)} vs ${b} ${formatHours(highlights.biggestGap.theirPlaytime)}`}
            />
          )}
          {highlights.neitherPlayed > 0 && (
            <Chip
              theme={theme}
              label="Unplayed by both"
              value={`${highlights.neitherPlayed} game${highlights.neitherPlayed === 1 ? "" : "s"}`}
              sub="owned by both, played by neither"
            />
          )}
        </div>
      )}
    </div>
  );
}
