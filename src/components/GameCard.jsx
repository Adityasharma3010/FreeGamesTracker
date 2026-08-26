import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useFavorites } from "../context/FavoritesContext.jsx";
import { useSteam } from "../context/SteamContext.jsx";
import { primaryPlatformFor, typeKeyFor, TYPES, isLight } from "../lib/platforms.js";
import { extractSteamAppId } from "../lib/steamMatch.js";
import PlatformIcon from "./PlatformIcon.jsx";
import { LuStar } from "react-icons/lu";
import { SiSteam } from "react-icons/si";

function formatEndDate(end_date) {
  if (!end_date || end_date === "N/A") return "No end date listed";
  const d = new Date(end_date);
  if (isNaN(d.getTime())) return end_date;
  return `Ends ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export default function GameCard({ giveaway, index }) {
  const { theme, dark } = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { connected: steamConnected, isWishlisted } = useSteam();
  const [hover, setHover] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  const p = primaryPlatformFor(giveaway.platforms);
  const typeKey = typeKeyFor(giveaway.type);
  const t = TYPES[typeKey];
  const saved = isFavorite(giveaway.id);

  const steamAppId = extractSteamAppId(giveaway.open_giveaway_url || giveaway.gamerpower_url);
  const wishlisted = steamConnected && isWishlisted(steamAppId);
  // NOTE: "owned game has free DLC" isn't implemented yet — a DLC's own
  // Steam App ID isn't the same ID as its base game's, so checking it
  // against the library directly would be wrong. That needs a separate
  // Steam Store lookup per DLC entry to resolve the base game first
  // (see README) — scoped out of this round rather than shown inaccurately.

  return (
    <div
      style={{
        animationDelay: `${Math.min(index, 12) * 70}ms`,
        clipPath: "polygon(0 16px, 16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)",
        background: dark
          ? `linear-gradient(165deg, ${p.a}38 0%, ${p.d} 38%, ${theme.cardBase} 75%)`
          : `linear-gradient(165deg, ${p.a}2e 0%, ${theme.cardBase} 55%)`,
        boxShadow: hover
          ? `0 0 0 2.5px ${p.a}, 0 0 50px 10px ${p.a}77, 0 24px 44px -18px ${p.a}88`
          : `0 0 0 2px ${p.a}, 0 10px 28px -16px ${p.a}66`,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group motion-safe:opacity-0 motion-safe:animate-card-in relative rounded-md transition-transform duration-300 ease-out will-change-transform hover:-translate-y-1.5 active:translate-y-0 flex flex-col"
    >
      <span className="absolute top-2.5 right-3.5 w-1.5 h-1.5 rounded-full" style={{ background: p.a, boxShadow: `0 0 6px ${p.a}` }} />
      <span className="absolute bottom-2.5 left-3.5 w-1.5 h-1.5 rounded-full" style={{ background: p.a, boxShadow: `0 0 6px ${p.a}` }} />

      {/* platform banner — gradient into the platform's dark tone instead
          of a flat block, so light accents (Epic, PC) still read as
          "branded" rather than "washed out / disabled" */}
      <div className="flex items-center justify-between px-3.5 py-2.5" style={{ background: `linear-gradient(100deg, ${p.a} 0%, ${p.a} 55%, ${p.d} 130%)` }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <PlatformIcon platformKey={p.key} size={14} style={{ color: isLight(p.a) ? "#151517" : "#fff" }} className="shrink-0" />
          <span className="text-[11px] font-black tracking-wide uppercase truncate" style={{ color: isLight(p.a) ? "#151517" : "#fff" }}>
            {p.label}
          </span>
        </div>
        <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}>
          {t.chip}
        </span>
      </div>

      {/* Steam wishlist callout — a distinct gold accent so it reads as
          "this is about YOU specifically", separate from the platform's
          own color language used everywhere else. */}
      {wishlisted && (
        <div
          className="flex items-center gap-1.5 px-3.5 py-1.5"
          style={{ background: "linear-gradient(90deg, #fbbf24, #f59e0b)" }}
        >
          <SiSteam size={12} color="#151517" />
          <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: "#151517" }}>
            On your Steam wishlist
          </span>
        </div>
      )}

      {/* thumbnail */}
      <div className="relative mx-3.5 mt-3 h-32 sm:h-28 rounded-sm overflow-hidden" style={{ background: `linear-gradient(135deg, ${p.a}55, ${p.d})` }}>
        {imgOk && giveaway.thumbnail ? (
          <img
            src={giveaway.thumbnail}
            alt=""
            loading="lazy"
            onError={() => setImgOk(false)}
            className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-70"
          />
        ) : null}
        <div
          className="absolute inset-0 opacity-40"
          style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${p.a}88 1px, transparent 0)`, backgroundSize: "12px 12px" }}
        />
        {(!imgOk || !giveaway.thumbnail) && (
          <span className="absolute inset-0 flex items-center justify-center opacity-90" style={{ filter: `drop-shadow(0 0 16px ${p.a}cc)` }}>
            <PlatformIcon platformKey={p.key} size={48} style={{ color: p.a }} />
          </span>
        )}

        {/* Save/favorite toggle. Hover-to-reveal only where hover is a
            real input method (mouse) — `[@media(hover:hover)]` is a
            genuine capability check, not a screen-size guess, so it
            correctly stays always-visible on touch devices regardless
            of their width. */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(giveaway);
          }}
          aria-label={saved ? "Remove from favorites" : "Save to favorites"}
          aria-pressed={saved}
          className={[
            "tap-target absolute top-1.5 right-1.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90",
            saved ? "opacity-100" : "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100",
          ].join(" ")}
          style={{
            background: saved ? p.a : "rgba(0,0,0,0.5)",
            boxShadow: saved ? `0 0 14px ${p.a}bb` : "none",
            backdropFilter: "blur(4px)",
          }}
        >
          <LuStar size={16} color={saved ? (isLight(p.a) ? "#151517" : "#fff") : "#fff"} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* body */}
      <div className="p-3.5 pt-3 flex flex-col gap-2 flex-1">
        <h3 className="font-black text-[15px] leading-tight line-clamp-2" style={{ color: theme.text }}>
          {giveaway.title}
        </h3>
        <p className="text-[12.5px] leading-snug line-clamp-2" style={{ color: theme.textDim }}>
          {giveaway.description}
        </p>

        <div className="flex items-center justify-between pt-2.5 mt-auto border-t" style={{ borderColor: `${p.a}55` }}>
          <span className="text-[10.5px] font-bold flex items-center gap-1 min-w-0" style={{ color: theme.textFaint }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.a, boxShadow: `0 0 6px ${p.a}` }} />
            <span className="truncate">{formatEndDate(giveaway.end_date)}</span>
          </span>
          <a
            href={giveaway.open_giveaway_url || giveaway.gamerpower_url}
            target="_blank"
            rel="noopener noreferrer"
            className="tap-target relative text-[11.5px] font-black px-3.5 py-2 rounded-sm overflow-hidden group/btn active:scale-95 transition-transform duration-150 tracking-wide flex items-center shrink-0"
            style={{ background: p.a, color: isLight(p.a) ? "#151517" : "#fff", boxShadow: `0 4px 14px -3px ${p.a}aa` }}
          >
            <span className="relative z-10">CLAIM →</span>
            <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.6),transparent)]" />
          </a>
        </div>
      </div>
    </div>
  );
}
