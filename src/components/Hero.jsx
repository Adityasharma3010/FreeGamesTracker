import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Hero({ stats }) {
  const { theme, dark } = useTheme();

  return (
    <header className="relative z-10 overflow-hidden theme-transition">
      <div className="absolute inset-0" style={{ background: theme.heroBg }} />
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none motion-safe:animate-scan"
        style={{ background: "linear-gradient(180deg, transparent, rgba(217,70,239,0.6), transparent)" }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-8 sm:pb-10">
        <span
          className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-black tracking-[0.15em] uppercase px-3 py-1 mb-4 sm:mb-5 border-2"
          style={{ borderColor: "#e879f9", color: dark ? "#f0abfc" : "#a21caf", clipPath: "polygon(6px 0,100% 0,100% 100%,0 100%,0 6px)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 motion-safe:animate-pulse-dot" />
          {stats.live} drops live now
        </span>

        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black leading-[0.98] tracking-tight" style={{ color: theme.text }}>
          CLAIM FREE
          <br />
          <span style={{ background: "linear-gradient(90deg,#c026d3,#7c3aed,#0ea5e9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            GAMES FIRST.
          </span>
        </h1>
        <p className="mt-3 sm:mt-4 text-sm sm:text-base max-w-md font-medium" style={{ color: theme.textDim }}>
          Every free game, weekend pass, and trial across Steam, Epic, GOG, PlayStation, Xbox, Switch, and mobile — tracked live, all in one place.
        </p>
        <p className="mt-2 text-[11px] sm:text-xs font-semibold max-w-md" style={{ color: theme.textFaint }}>
          "Claim" opens the real store page in a new tab — we can't add anything to your library automatically, no service publicly supports that.
        </p>

        <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 max-w-xl">
          {[
            ["Live drops", stats.live],
            ["Platforms", stats.platforms],
            ["Free to keep", stats.keep],
            ["Weekends / trials", stats.trials],
          ].map(([label, value]) => (
            <div
              key={label}
              className="px-3 py-2.5 backdrop-blur-md border-2 theme-transition"
              style={{ background: theme.surface, borderColor: theme.surfaceBorder, clipPath: "polygon(8px 0,100% 0,100% 100%,0 100%,0 8px)" }}
            >
              <div className="text-base sm:text-lg font-black leading-none" style={{ color: theme.text }}>
                {value}
              </div>
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide mt-1" style={{ color: theme.textFaint }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
