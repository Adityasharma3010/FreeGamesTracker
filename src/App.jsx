import React, { useMemo, useState } from "react";
import { useTheme } from "./context/ThemeContext.jsx";
import { useGiveaways } from "./hooks/useGiveaways.js";
import { matchesPlatform, typeKeyFor } from "./lib/platforms.js";
import Nav from "./components/Nav.jsx";
import Hero from "./components/Hero.jsx";
import Filters from "./components/Filters.jsx";
import GameGrid from "./components/GameGrid.jsx";
import WatchView from "./components/WatchView.jsx";
import AmbientBackground from "./components/AmbientBackground.jsx";
import TrialNewsBadge from "./components/TrialNewsBadge.jsx";
import FavoritesBadge from "./components/FavoritesBadge.jsx";

function endTimestamp(g) {
  if (!g.end_date || g.end_date === "N/A") return Infinity; // no end date sorts last
  const t = new Date(g.end_date).getTime();
  return isNaN(t) ? Infinity : t;
}

export default function App() {
  const { theme } = useTheme();
  const { giveaways, status, error, refresh } = useGiveaways();

  const [platformFilter, setPlatformFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = giveaways.filter(
      (g) =>
        matchesPlatform(g.platforms, platformFilter) &&
        (typeFilter === "all" || typeKeyFor(g.type) === typeFilter) &&
        (!q || g.title.toLowerCase().includes(q)),
    );

    list = [...list].sort((a, b) => {
      if (sortBy === "ending") return endTimestamp(a) - endTimestamp(b);
      // newest first, by published_date
      return (
        new Date(b.published_date).getTime() -
        new Date(a.published_date).getTime()
      );
    });

    return list;
  }, [giveaways, platformFilter, typeFilter, sortBy, search]);

  const stats = useMemo(
    () => ({
      live: giveaways.length,
      platforms: new Set(
        giveaways.flatMap((g) =>
          (g.platforms || "").split(",").map((s) => s.trim().toLowerCase()),
        ),
      ).size,
      keep: giveaways.filter((g) => typeKeyFor(g.type) === "game").length,
      trials: giveaways.filter((g) => typeKeyFor(g.type) !== "game").length,
    }),
    [giveaways],
  );

  return (
    <>
      {/* Normal layout — hidden on small SQUARE/round displays (watches).
          Using a compound width+height query rather than width alone so a
          tall narrow phone doesn't get mistaken for a watch. */}
      <div className="[@media(max-width:450px)_and_(max-height:450px)]:hidden">
        <div
          className="min-h-screen font-sans theme-transition"
          style={{ background: theme.pageBg, color: theme.text }}
        >
          <AmbientBackground />
          <Nav />
          <Hero stats={stats} />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 mt-2">
            <Filters
              platformFilter={platformFilter}
              setPlatformFilter={setPlatformFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              search={search}
              setSearch={setSearch}
            />
          </div>

          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-9 relative z-10">
            <GameGrid
              giveaways={filtered}
              status={status}
              error={error}
              onRetry={refresh}
            />
          </main>

          <TrialNewsBadge />
          <FavoritesBadge />

          <footer
            className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 text-center text-[11px] font-semibold"
            style={{ color: theme.textFaint }}
          >
            Not affiliated with Steam, Epic Games, GOG, PlayStation, Xbox, or
            Nintendo — "Claim" opens the official store page.
          </footer>
        </div>
      </div>

      {/* Watch view — only shown on small square/round displays */}
      <div className="hidden [@media(max-width:450px)_and_(max-height:450px)]:block">
        <WatchView
          giveaways={filtered}
          platformFilter={platformFilter}
          setPlatformFilter={setPlatformFilter}
          status={status}
        />
      </div>
    </>
  );
}
