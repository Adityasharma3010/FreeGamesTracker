import React from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useSteam } from "../../context/SteamContext.jsx";
import { useSteamMatches } from "../../hooks/useSteamMatches.js";

function MatchSkeleton({ theme }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-2"
      aria-label="Loading matches"
      role="status"
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-12 motion-safe:animate-pulse"
          style={{ background: theme.chipBg }}
        />
      ))}
    </div>
  );
}

export default function SteamMatchesPage() {
  const { theme } = useTheme();
  const { status } = useSteam();
  const { matches } = useSteamMatches();

  // Was `return null` here — a real blank screen while the account's
  // wishlist/giveaway data is still loading, not just an unstyled state.
  if (status === "loading" || status === "idle")
    return <MatchSkeleton theme={theme} />;
  if (status !== "success") return null;

  if (matches.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: theme.textDim }}>
        Nothing on your wishlist is in the current giveaway list right now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {matches.map((g, i) => (
        <a
          key={g.id}
          href={g.open_giveaway_url || g.gamerpower_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            animationDelay: `${Math.min(i, 20) * 50}ms`,
            background: "#fbbf241a",
            borderColor: "#fbbf24",
          }}
          className="tap-target motion-safe:opacity-0 motion-safe:animate-card-in flex items-center justify-between gap-2 px-4 py-3 border transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_14px_#fbbf2466]"
        >
          <span
            className="text-[13px] font-bold leading-snug line-clamp-1"
            style={{ color: theme.text }}
          >
            {g.title}
          </span>
          <span
            className="text-[10px] font-black uppercase shrink-0"
            style={{ color: "#fbbf24" }}
          >
            Claim →
          </span>
        </a>
      ))}
    </div>
  );
}
