import React, { useMemo, useState } from "react";
import { LuBarChart3, LuChevronDown } from "react-icons/lu";
import { SiSteam } from "react-icons/si";
import SteamGameImage from "./SteamGameImage.jsx";
import { computeLibraryStats } from "../lib/steamLibraryStats.js";
import { formatHours } from "../lib/steamCompare.js";

const BUCKET_COLORS = {
  never: "#6b7280",
  tiny: "#22d3ee",
  short: "#2fb4ff",
  medium: "#a855f7",
  long: "#e879f9",
  huge: "#fbbf24",
};

function Stat({ label, value, sub, theme }) {
  return (
    <div className="flex flex-col min-w-0">
      <span
        className="text-[10px] font-black uppercase tracking-wide"
        style={{ color: theme.textFaint }}
      >
        {label}
      </span>
      <span
        className="text-[18px] font-black leading-tight"
        style={{ color: theme.text }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[10.5px]" style={{ color: theme.textDim }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function ThumbFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <SiSteam size={12} className="text-white/40" />
    </div>
  );
}

// Collapsible stats card for the Library page. Always computed over the
// WHOLE library (not the searched/filtered view), so the numbers don't
// jump around while you type in the search box.
export default function LibraryStats({ games, theme, onSelect }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(() => new Set());
  const stats = useMemo(() => computeLibraryStats(games), [games]);
  if (stats.total === 0) return null;

  const maxBucket = Math.max(1, ...stats.buckets.map((b) => b.count));
  const maxTop = stats.top[0]?.playtime || 1;
  const hoursLabel = Math.round(stats.totalHours).toLocaleString("en-US");

  return (
    <div
      className="border"
      style={{ background: theme.surface, borderColor: theme.surfaceBorder }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap-target w-full flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer text-left"
      >
        <span
          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide shrink-0"
          style={{ color: "#2fb4ff" }}
        >
          <LuBarChart3 size={14} /> Library stats
        </span>
        <span
          className="flex items-center gap-3 min-w-0 text-[11.5px]"
          style={{ color: theme.textDim }}
        >
          <span className="truncate">
            <b style={{ color: theme.text }}>{hoursLabel}h</b> played ·{" "}
            <b style={{ color: theme.text }}>{stats.neverPct}%</b> never played
          </span>
          <LuChevronDown
            size={14}
            className="shrink-0 transition-transform duration-200"
            style={{
              transform: open ? "rotate(180deg)" : "none",
              color: theme.textFaint,
            }}
          />
        </span>
      </button>

      {open && (
        <div
          className="flex flex-col gap-5 px-3 pb-4 pt-1 border-t"
          style={{ borderColor: theme.surfaceBorder }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <Stat theme={theme} label="Games" value={stats.total} />
            <Stat
              theme={theme}
              label="Total playtime"
              value={`${hoursLabel}h`}
              sub={
                stats.totalDays >= 1
                  ? `≈ ${stats.totalDays.toFixed(1).replace(/\.0$/, "")} days non-stop`
                  : null
              }
            />
            <Stat
              theme={theme}
              label="Never played"
              value={stats.never}
              sub={`${stats.neverPct}% of your library`}
            />
            <Stat
              theme={theme}
              label="Avg per played game"
              value={formatHours(stats.avgMinutesPlayed)}
              sub={`${stats.played} game${stats.played === 1 ? "" : "s"} played`}
            />
          </div>

          <section>
            <h3
              className="text-[10.5px] font-black uppercase tracking-wide mb-2"
              style={{ color: theme.textFaint }}
            >
              Games by hours played
            </h3>
            <div className="flex flex-col gap-1.5">
              {stats.buckets.map((b) => (
                <div key={b.key} className="flex items-center gap-2">
                  <span
                    className="w-[84px] shrink-0 text-[11px]"
                    style={{ color: theme.textDim }}
                  >
                    {b.label}
                  </span>
                  <div
                    className="flex-1 h-3"
                    style={{ background: theme.chipBg }}
                  >
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(b.count / maxBucket) * 100}%`,
                        background: BUCKET_COLORS[b.key],
                      }}
                    />
                  </div>
                  <span
                    className="w-8 text-right text-[11px] font-bold tabular-nums"
                    style={{ color: theme.text }}
                  >
                    {b.count}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {stats.top.length > 0 && (
            <section>
              <h3
                className="text-[10.5px] font-black uppercase tracking-wide mb-0.5"
                style={{ color: theme.textFaint }}
              >
                Most played
              </h3>
              <p className="text-[11px] mb-2" style={{ color: theme.textDim }}>
                These {stats.top.length} make up {stats.topSharePct}% of all
                your playtime.
              </p>
              <ol className="flex flex-col gap-1">
                {stats.top.map((g, i) => (
                  <li key={g.appid}>
                    <button
                      type="button"
                      onClick={() => onSelect?.({ appid: g.appid })}
                      className="group w-full flex items-center gap-2.5 p-1 cursor-pointer text-left transition-colors duration-150 hover:bg-white/5"
                    >
                      <span
                        className="w-5 text-right text-[11px] font-black tabular-nums shrink-0"
                        style={{ color: theme.textFaint }}
                      >
                        {i + 1}
                      </span>
                      <div className="relative w-16 shrink-0 aspect-[460/215] overflow-hidden bg-white/5">
                        {failed.has(g.appid) ? (
                          <ThumbFallback />
                        ) : (
                          <SteamGameImage
                            appid={g.appid}
                            className="absolute inset-0 w-full h-full object-cover"
                            onAllFailed={() =>
                              setFailed((s) => new Set(s).add(g.appid))
                            }
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className="text-[12px] font-bold truncate"
                            style={{ color: theme.text }}
                          >
                            {g.name}
                          </span>
                          <span
                            className="text-[11px] font-bold shrink-0 tabular-nums"
                            style={{ color: theme.textDim }}
                          >
                            {formatHours(g.playtime)}
                          </span>
                        </div>
                        <div
                          className="h-1 mt-1"
                          style={{ background: theme.chipBg }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${(g.playtime / maxTop) * 100}%`,
                              background: "#2fb4ff",
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
