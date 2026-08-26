import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useFavorites } from "../context/FavoritesContext.jsx";
import { primaryPlatformFor } from "../lib/platforms.js";
import PlatformIcon from "./PlatformIcon.jsx";
import { LuStar, LuX, LuTrash2 } from "react-icons/lu";

export default function FavoritesBadge() {
  const { theme } = useTheme();
  const { favorites, removeFavorite } = useFavorites();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target))
        setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (favorites.length === 0) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[900] left-4 sm:left-6"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {open && (
        <div
          className="mb-2.5 w-[calc(100vw-2rem)] sm:w-96 max-h-[60vh] overflow-y-auto border-2 backdrop-blur-xl motion-safe:animate-card-in"
          style={{
            background: theme.panelBg,
            borderColor: theme.panelBorder,
            clipPath: "polygon(12px 0,100% 0,100% 100%,0 100%,0 12px)",
            boxShadow: "0 25px 60px -15px rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="flex items-start justify-between gap-2 px-3.5 pt-3.5 pb-2.5 sticky top-0"
            style={{ background: theme.panelBg }}
          >
            <h2
              className="text-[12px] font-black uppercase tracking-wide"
              style={{ color: theme.text }}
            >
              Saved games
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="tap-target shrink-0 flex items-center justify-center cursor-pointer"
              style={{ color: theme.textFaint }}
              aria-label="Close"
            >
              <LuX size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
            {favorites.map((fav) => {
              const p = primaryPlatformFor(fav.platform);
              return (
                <div
                  key={fav.id}
                  style={{
                    background: theme.surface,
                    borderColor: theme.surfaceBorder,
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 border"
                >
                  <PlatformIcon
                    platformKey={p.key}
                    size={16}
                    style={{ color: p.a }}
                    className="shrink-0"
                  />
                  <a
                    href={fav.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 transition-opacity duration-150 hover:opacity-70"
                  >
                    <p
                      className="text-[12.5px] font-bold leading-snug line-clamp-1"
                      style={{ color: theme.text }}
                    >
                      {fav.title}
                    </p>
                    <p
                      className="text-[10.5px] font-medium mt-0.5"
                      style={{ color: theme.textFaint }}
                    >
                      {p.label}
                    </p>
                  </a>
                  <button
                    onClick={() => removeFavorite(fav.id)}
                    aria-label="Remove from favorites"
                    className="tap-target shrink-0 flex items-center justify-center cursor-pointer transition-colors duration-150"
                    style={{ color: theme.textFaint }}
                  >
                    <LuTrash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="tap-target flex items-center gap-2 px-4 py-3 rounded-full border-2 font-black text-[12.5px] cursor-pointer uppercase tracking-wide transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: theme.panelBg,
          borderColor: "#fbbf24",
          color: "#fbbf24",
          boxShadow: open
            ? "0 0 24px #fbbf2499"
            : "0 8px 24px -6px rgba(0,0,0,0.5), 0 0 16px #fbbf2466",
        }}
      >
        <LuStar size={16} fill="currentColor" />
        {favorites.length}
      </button>
    </div>
  );
}
