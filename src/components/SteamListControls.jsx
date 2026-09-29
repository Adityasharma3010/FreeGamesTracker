import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import Chip from "./Chip.jsx";
import SortDropdown from "./SortDropdown.jsx";
import { LuSearch, LuX } from "react-icons/lu";

// Search box + filter chips + sort dropdown for the Steam Wishlist and
// Library grids. Styled to match the giveaway filter bar (Filters.jsx),
// and reuses its Chip and SortDropdown — the sort dropdown just takes the
// option list as a prop now.
export default function SteamListControls({ controls }) {
  const { theme } = useTheme();
  const [searchFocus, setSearchFocus] = useState(false);
  const {
    kind,
    search,
    setSearch,
    sorts,
    sort,
    setSort,
    filters,
    filter,
    setFilter,
  } = controls;

  return (
    <div
      className="p-3 backdrop-blur-xl border-2 flex flex-col gap-2.5"
      style={{
        background: theme.panelBg,
        borderColor: theme.panelBorder,
        clipPath:
          "polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-2 transition-all duration-200"
        style={
          searchFocus
            ? {
                borderColor: "#e879f9",
                boxShadow: "0 0 14px #e879f966",
                background: theme.chipBg,
              }
            : { borderColor: theme.chipBorder, background: theme.chipBg }
        }
      >
        <LuSearch
          size={15}
          style={{ color: theme.textFaint }}
          className="shrink-0"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
          placeholder={`Search your ${kind}…`}
          aria-label={`Search ${kind}`}
          autoComplete="off"
          spellCheck={false}
          className="tap-target flex-1 bg-transparent outline-none text-[13px] font-medium"
          style={{ color: theme.text }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="tap-target shrink-0 flex items-center justify-center cursor-pointer"
            style={{ color: theme.textFaint }}
            aria-label="Clear search"
          >
            <LuX size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
        {filters.length > 1 ? (
          <div className="flex flex-wrap gap-1.5 -m-1.5 p-1.5">
            {filters.map((f) => (
              <Chip
                key={f.key}
                active={filter === f.key}
                onClick={() => setFilter(f.key)}
                label={f.label}
              />
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10.5px] font-black uppercase tracking-wide"
            style={{ color: theme.textFaint }}
          >
            Sort
          </span>
          <SortDropdown value={sort} onChange={setSort} options={sorts} />
        </div>
      </div>
    </div>
  );
}

// "12 of 289 games" on the left, optional action (e.g. Export CSV) on the
// right.
export function ListSummary({ controls, children }) {
  const { theme } = useTheme();
  const { visible, total, isFiltered } = controls;
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className="text-[11px] font-bold uppercase tracking-wide"
        style={{ color: theme.textFaint }}
        aria-live="polite"
      >
        {isFiltered ? `${visible.length} of ${total} games` : `${total} games`}
      </span>
      {children}
    </div>
  );
}

// Shown when a search/filter matches nothing.
export function NoMatches({ controls }) {
  const { theme } = useTheme();
  return (
    <div
      className="flex flex-col items-start gap-2 py-6"
      style={{ color: theme.textDim }}
    >
      <p className="text-[13px]">No games match that.</p>
      <button
        type="button"
        onClick={controls.reset}
        className="tap-target text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border cursor-pointer transition-colors duration-150 hover:bg-white/10"
        style={{ borderColor: theme.surfaceBorder, color: theme.textFaint }}
      >
        Clear search &amp; filters
      </button>
    </div>
  );
}
