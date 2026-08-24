import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import GameCard from "./GameCard.jsx";

export default function GameGrid({ giveaways, status, error, onRetry }) {
  const { theme } = useTheme();

  if (status === "loading" && giveaways.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-md motion-safe:animate-pulse"
            style={{ background: theme.surface, border: `2px solid ${theme.surfaceBorder}` }}
          />
        ))}
      </div>
    );
  }

  if (status === "error" && giveaways.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <p className="font-black text-lg mb-2" style={{ color: theme.text }}>
          Couldn't load current giveaways.
        </p>
        <p className="text-sm mb-5" style={{ color: theme.textDim }}>
          {error}
        </p>
        <button
          onClick={onRetry}
          className="tap-target px-5 py-2.5 rounded-sm font-bold text-sm"
          style={{ background: "#7c3aed", color: "#fff", boxShadow: "0 0 16px #7c3aed88" }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (giveaways.length === 0) {
    return (
      <p className="text-center py-16 font-semibold" style={{ color: theme.textDim }}>
        No drops match those filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {giveaways.map((g, i) => (
        <GameCard key={g.id} giveaway={g} index={i} />
      ))}
    </div>
  );
}
