import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { PLATFORMS, primaryPlatformFor } from "../lib/platforms.js";
import PlatformIcon from "./PlatformIcon.jsx";

// Built for very small square/round displays (WearOS etc). Detected in
// App.jsx via a compound width+height media query, not width alone —
// a tall narrow phone (390x844) shouldn't get this view even though its
// width overlaps the watch range; a watch is small in BOTH dimensions.
export default function WatchView({ giveaways, platformFilter, setPlatformFilter, status }) {
  const { theme, dark, setDark } = useTheme();

  return (
    <div className="min-h-screen px-3 py-4 theme-transition" style={{ background: theme.pageBg }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-black" style={{ color: theme.text }}>
          🕹 Free Games
        </span>
        <button
          onClick={() => setDark(!dark)}
          className="tap-target w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ background: theme.surface, border: `1px solid ${theme.surfaceBorder}` }}
          aria-label="Toggle theme"
        >
          {dark ? "🌙" : "☀️"}
        </button>
      </div>

      <select
        value={platformFilter}
        onChange={(e) => setPlatformFilter(e.target.value)}
        className="tap-target w-full mb-3 text-[12px] font-bold px-2 py-2 rounded-sm border-2"
        style={{ background: theme.chipBg, borderColor: theme.chipBorder, color: theme.chipText }}
      >
        <option value="all">All platforms</option>
        {Object.entries(PLATFORMS).map(([key, p]) => (
          <option key={key} value={key}>
            {p.label}
          </option>
        ))}
      </select>

      {status === "loading" && giveaways.length === 0 && (
        <p className="text-center text-[12px] py-6" style={{ color: theme.textDim }}>
          Loading…
        </p>
      )}

      <div className="flex flex-col gap-2">
        {giveaways.slice(0, 20).map((g) => {
          const p = primaryPlatformFor(g.platforms);
          return (
            <a
              key={g.id}
              href={g.open_giveaway_url || g.gamerpower_url}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target flex items-center gap-2 px-2.5 py-2.5 rounded-md active:scale-95 transition-transform"
              style={{ background: `${p.a}22`, border: `2px solid ${p.a}` }}
            >
              <PlatformIcon platformKey={p.key} size={18} style={{ color: p.a }} className="shrink-0" />
              <span className="text-[12px] font-bold leading-tight line-clamp-2" style={{ color: theme.text }}>
                {g.title}
              </span>
            </a>
          );
        })}
        {giveaways.length === 0 && status !== "loading" && (
          <p className="text-center text-[12px] py-6" style={{ color: theme.textDim }}>
            No drops right now.
          </p>
        )}
      </div>
    </div>
  );
}
