import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { PLATFORMS, TYPES } from "../lib/platforms.js";
import Chip from "./Chip.jsx";
import SortDropdown from "./SortDropdown.jsx";
import { LuGlobe, LuSearch, LuX } from "react-icons/lu";

export default function Filters({
  platformFilter,
  setPlatformFilter,
  typeFilter,
  setTypeFilter,
  sortBy,
  setSortBy,
  search,
  setSearch,
}) {
  const { theme } = useTheme();
  const [allHover, setAllHover] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);

  const allActive = platformFilter === "all";

  return (
    <div
      className="p-3 backdrop-blur-xl border-2 flex flex-col gap-2.5"
      style={{ background: theme.panelBg, borderColor: theme.panelBorder, clipPath: "polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)" }}
    >
      {/* search */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-2 transition-all duration-200"
        style={
          searchFocus
            ? { borderColor: "#e879f9", boxShadow: "0 0 14px #e879f966", background: theme.chipBg }
            : { borderColor: theme.chipBorder, background: theme.chipBg }
        }
      >
        <LuSearch size={15} style={{ color: theme.textFaint }} className="shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
          placeholder="Search for a game…"
          className="tap-target flex-1 bg-transparent outline-none text-[13px] font-medium"
          style={{ color: theme.text }}
        />
        {search && (
          <button onClick={() => setSearch("")} className="tap-target shrink-0 flex items-center justify-center" style={{ color: theme.textFaint }} aria-label="Clear search">
            <LuX size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 md:pb-0">
          <button
            onClick={() => setPlatformFilter("all")}
            onMouseEnter={() => setAllHover(true)}
            onMouseLeave={() => setAllHover(false)}
            style={
              allActive
                ? { borderColor: "#e879f9", color: "#e879f9", background: "#e879f922", boxShadow: allHover ? "0 0 16px #e879f988" : "0 0 12px #e879f966" }
                : allHover
                ? { borderColor: "#e879f9", color: "#e879f9", background: "#e879f914", boxShadow: "0 0 10px #e879f955" }
                : { borderColor: theme.chipBorder, color: theme.chipText, background: theme.chipBg }
            }
            className="tap-target text-[11.5px] font-bold px-3 py-1.5 rounded-sm border-2 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 whitespace-nowrap uppercase tracking-wide"
          >
            <LuGlobe size={13} />
            All
          </button>
          {Object.entries(PLATFORMS).map(([key, p]) => (
            <Chip key={key} active={platformFilter === key} onClick={() => setPlatformFilter(key)} label={p.label} color={p.a} platformKey={key} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={typeFilter === "all"} onClick={() => setTypeFilter("all")} label="All types" />
          {Object.entries(TYPES).map(([key, t]) => (
            <Chip key={key} active={typeFilter === key} onClick={() => setTypeFilter(key)} label={t.label} color="#e879f9" />
          ))}

          <SortDropdown value={sortBy} onChange={setSortBy} />
        </div>
      </div>
    </div>
  );
}
