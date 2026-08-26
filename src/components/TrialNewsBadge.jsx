import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useTrialNews } from "../hooks/useTrialNews.js";
import PlatformIcon from "./PlatformIcon.jsx";
import { LuRadar, LuX } from "react-icons/lu";

function formatDate(pubDate) {
  if (!pubDate) return "";
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Lives outside the normal page flow entirely — fixed to a corner instead
// of buried at the bottom of a long scrolling grid, so it's visible the
// moment there's something to show without needing to scroll for it.
// Deliberately not styled like GameCard: this is a keyword-matched guess
// from publisher news, not a confirmed giveaway.
export default function TrialNewsBadge() {
  const { theme } = useTheme();
  const { items, status } = useTrialNews();
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

  if (status !== "success" || items.length === 0) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[900] right-4 sm:right-6 flex flex-col items-end"
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
            <div>
              <h2
                className="text-[12px] font-black uppercase tracking-wide"
                style={{ color: theme.text }}
              >
                Spotted in publisher news
              </h2>
              <p
                className="text-[10.5px] font-medium mt-0.5 leading-snug"
                style={{ color: theme.textFaint }}
              >
                Auto-detected, not a confirmed giveaway — check the article
                before assuming it's live.
              </p>
            </div>
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
            {items.map((item) => (
              <a
                key={item.link}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: theme.surface,
                  borderColor: theme.surfaceBorder,
                }}
                className="tap-target flex items-center gap-2.5 px-3 py-2.5 border transition-all duration-200 hover:scale-[1.02]"
              >
                <PlatformIcon
                  platformKey={item.platform}
                  size={16}
                  style={{ color: theme.textDim }}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[12.5px] font-bold leading-snug line-clamp-1"
                    style={{ color: theme.text }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="text-[10.5px] font-medium mt-0.5"
                    style={{ color: theme.textFaint }}
                  >
                    {item.source}
                    {item.pubDate ? ` · ${formatDate(item.pubDate)}` : ""}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="tap-target flex items-center gap-2 px-4 py-3 rounded-full border-2 font-black text-[12.5px] cursor-pointer uppercase tracking-wide transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: theme.panelBg,
          borderColor: "#e879f9",
          color: "#e879f9",
          boxShadow: open
            ? "0 0 24px #e879f999"
            : "0 8px 24px -6px rgba(0,0,0,0.5), 0 0 16px #e879f966",
        }}
      >
        <LuRadar size={16} />
        {items.length}
      </button>
    </div>
  );
}
