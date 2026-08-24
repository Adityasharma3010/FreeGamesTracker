import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Nav() {
  const { theme, dark, setDark } = useTheme();

  return (
    <nav className="relative z-20 backdrop-blur-xl border-b-2 theme-transition" style={{ background: theme.navBg, borderColor: theme.navBorder }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-9 h-9 flex items-center justify-center text-base font-black text-white shrink-0"
            style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", clipPath: "polygon(0 8px,8px 0,100% 0,100% 100%,0 100%)", boxShadow: "0 0 18px rgba(217,70,239,0.6)" }}
          >
            🕹
          </div>
          <span className="font-black tracking-tight text-base sm:text-lg truncate" style={{ color: theme.text }}>
            FREE<span className="text-fuchsia-500">GAMES</span>TRACKER
          </span>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-full border-2 shrink-0" style={{ background: theme.surface, borderColor: theme.surfaceBorder }}>
          <button
            onClick={() => setDark(false)}
            aria-label="Light mode"
            className="tap-target px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1"
            style={!dark ? { background: "#fbbf24", color: "#111", boxShadow: "0 0 12px #fbbf2488" } : { color: theme.toggleInactive }}
          >
            ☀️<span className="hidden xs:inline">Light</span>
          </button>
          <button
            onClick={() => setDark(true)}
            aria-label="Dark mode"
            className="tap-target px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1"
            style={dark ? { background: "#7c3aed", color: "#fff", boxShadow: "0 0 12px #7c3aed88" } : { color: theme.toggleInactive }}
          >
            🌙<span className="hidden xs:inline">Dark</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
