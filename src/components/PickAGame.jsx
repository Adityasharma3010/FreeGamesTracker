import React from "react";
import { LuShuffle, LuX } from "react-icons/lu";
import SteamGameImage from "./SteamGameImage.jsx";
import { formatHours } from "../lib/steamCompare.js";

// The "Play this next" card shown above the Library grid after pressing
// "Pick a game". The pick itself is decided by pickRandomGame() in
// src/lib/steamCompare.js — this is just the display.
export default function PickAGame({
  game,
  theme,
  onPickAnother,
  onOpen,
  onClose,
}) {
  const played = game.playtime > 0;
  return (
    <div
      className="flex flex-col sm:flex-row gap-3 p-3 border-2 motion-safe:animate-card-in"
      style={{
        background: theme.panelBg,
        borderColor: "#e879f9",
        boxShadow: "0 0 14px #e879f944",
      }}
      role="region"
      aria-live="polite"
      aria-label="Suggested game"
    >
      <div
        className="relative w-full sm:w-64 shrink-0 aspect-[460/215] overflow-hidden"
        style={{ background: theme.chipBg }}
      >
        <SteamGameImage
          appid={game.appid}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col justify-between gap-3 min-w-0 flex-1">
        <div className="min-w-0">
          <span
            className="text-[10.5px] font-black uppercase tracking-wide"
            style={{ color: "#e879f9" }}
          >
            Play this next
          </span>
          <h3
            className="text-[18px] font-black leading-tight break-words"
            style={{ color: theme.text }}
          >
            {game.name}
          </h3>
          <p
            className="text-[11.5px] font-bold"
            style={{ color: theme.textFaint }}
          >
            {played
              ? `${formatHours(game.playtime)} played so far`
              : "Never played"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPickAnother}
            className="tap-target flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border-2 cursor-pointer transition-colors duration-150"
            style={{
              borderColor: "#e879f9",
              color: "#e879f9",
              background: "#e879f922",
            }}
          >
            <LuShuffle size={12} /> Pick another
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="tap-target text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border cursor-pointer transition-colors duration-150 hover:bg-white/10"
            style={{ borderColor: theme.surfaceBorder, color: theme.chipText }}
          >
            View game
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tap-target flex items-center gap-1 text-[10.5px] font-black uppercase tracking-wide px-2 py-1.5 cursor-pointer ml-auto"
            style={{ color: theme.textFaint }}
            aria-label="Close suggestion"
          >
            <LuX size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
