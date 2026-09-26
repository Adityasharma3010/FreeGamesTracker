import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSteam } from "../context/SteamContext.jsx";
import { useGiveaways } from "../hooks/useGiveaways.js";
import { extractSteamAppId } from "../lib/steamMatch.js";
import { SiSteam } from "react-icons/si";
import SteamGameImage from "./SteamGameImage.jsx";
import { LuX } from "react-icons/lu";

export function GameTile({
  appid,
  name,
  theme,
  highlight,
  badge,
  index,
  onSelect,
}) {
  const [imgOk, setImgOk] = useState(true);
  const [hover, setHover] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  // Steam's real box art, straight from their public CDN — no extra API
  // call needed, works for virtually any App ID. Much better than the
  // tiny 32x32 icon GetOwnedGames/wishlistdata hand back by default.
  const glow = highlight ? "#fbbf24" : "#2fb4ff";

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -8, y: px * 8 });
  };

  return (
    <button
      type="button"
      onClick={() => onSelect({ appid, name })}
      onMouseEnter={() => setHover(true)}
      onMouseMove={handleMove}
      onMouseLeave={() => {
        setHover(false);
        setTilt({ x: 0, y: 0 });
      }}
      style={{
        animationDelay: `${Math.min(index, 20) * 40}ms`,
        background: theme.surface,
        borderColor: highlight ? "#fbbf24" : hover ? glow : theme.surfaceBorder,
        boxShadow: hover
          ? `0 0 16px ${glow}77, 0 8px 20px -8px ${glow}55`
          : highlight
            ? "0 0 10px #fbbf2444"
            : "none",
        transform: `perspective(500px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hover ? "translateY(-4px)" : ""}`,
      }}
      className="group motion-safe:opacity-0 motion-safe:animate-card-in flex flex-col overflow-hidden border transition-[border-color,box-shadow] duration-200 active:scale-[0.97] will-change-transform text-left cursor-pointer"
    >
      <div
        className="relative w-full aspect-[460/215] overflow-hidden"
        style={{ background: theme.chipBg }}
      >
        {imgOk ? (
          <SteamGameImage
            appid={appid}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onAllFailed={() => setImgOk(false)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <SiSteam size={22} style={{ color: theme.textFaint }} />
          </div>
        )}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{
            background:
              "linear-gradient(0deg, rgba(0,0,0,0.55), transparent 60%)",
          }}
        />
        {highlight && (
          <span
            className="absolute top-1 right-1 text-[8.5px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-1"
            style={{ background: "#fbbf24", color: "#151517" }}
          >
            <span className="w-1 h-1 rounded-full bg-[#151517] motion-safe:animate-pulse-dot" />
            Free
          </span>
        )}
        {/* Independent of `highlight` (top-right, "Free") so a wishlist
            item can show "Owned" and a library item can show "Playing"
            without needing the gold free-game state too. */}
        {badge && (
          <span
            className="absolute top-1 left-1 text-[8.5px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded flex items-center gap-1"
            style={{ background: badge.color, color: "#0a0c11" }}
          >
            {badge.pulse && (
              <span className="w-1 h-1 rounded-full bg-[#0a0c11] motion-safe:animate-pulse-dot" />
            )}
            {badge.label}
          </span>
        )}
      </div>
      <span
        className="text-[11px] font-bold leading-snug line-clamp-2 px-2 py-1.5"
        style={{ color: theme.text }}
      >
        {name}
      </span>
    </button>
  );
}

export function TileSkeleton({ index }) {
  return (
    <div
      style={{ animationDelay: `${index * 60}ms` }}
      className="motion-safe:animate-pulse flex flex-col overflow-hidden border border-transparent"
    >
      <div
        className="w-full aspect-[460/215] rounded-sm"
        style={{ background: "rgba(127,127,127,0.15)" }}
      />
      <div
        className="h-2.5 w-3/4 rounded-full mt-1.5"
        style={{ background: "rgba(127,127,127,0.15)" }}
      />
    </div>
  );
}

// Drill-down detail view for a single wishlist/library tile — slides in
// from the right, distinct from the fade used for tab switching, so it
// reads as "going deeper" rather than just "content changed". Doesn't
// touch the modal's own border/glow animation at all — this only
// affects the content area beneath it.
export function GameDetailView({ game, theme, highlight, onBack }) {
  const [imgOk, setImgOk] = useState(true);
  const [details, setDetails] = useState(null); // null = loading
  const headerImg = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`;
  const glow = highlight ? "#fbbf24" : "#2fb4ff";

  useEffect(() => {
    let cancelled = false;
    setDetails(null);
    fetch(`/api/steam-appdetails?appid=${game.appid}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setDetails(d);
      })
      .catch(() => {
        if (!cancelled) setDetails({ found: false });
      });
    return () => {
      cancelled = true;
    };
  }, [game.appid]);

  return (
    <div className="flex flex-col gap-3">
      <style>{`
        @keyframes richFadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <button
        type="button"
        onClick={onBack}
        className="cursor-pointer flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide self-start transition-transform duration-150 hover:-translate-x-0.5"
        style={{ color: theme.textFaint }}
      >
        ← Back
      </button>

      <div
        className="relative w-full aspect-[460/215] overflow-hidden border"
        style={{
          background: theme.chipBg,
          borderColor: `${glow}55`,
          boxShadow: `0 0 20px ${glow}33`,
        }}
      >
        {imgOk ? (
          <img
            src={headerImg}
            alt=""
            onError={() => setImgOk(false)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <SiSteam size={32} style={{ color: theme.textFaint }} />
          </div>
        )}
        {highlight && (
          <span
            className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded flex items-center gap-1"
            style={{ background: "#fbbf24", color: "#151517" }}
          >
            <span className="w-1 h-1 rounded-full bg-[#151517] motion-safe:animate-pulse-dot" />
            Currently free
          </span>
        )}
      </div>

      <div>
        <h3
          className="text-base font-black leading-snug"
          style={{ color: theme.text }}
        >
          {game.name}
        </h3>
        <p
          className="text-[11px] font-bold mt-1"
          style={{ color: theme.textFaint }}
        >
          App ID {game.appid}
        </p>
      </div>

      {/* Extra store info — loads separately from the tile itself, only
          when a game is opened. Fades in on arrival rather than
          popping in, but doesn't block the rest of the view while it's
          loading. */}
      {details === null && (
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-3 rounded-full flex-1 motion-safe:animate-pulse"
              style={{ background: theme.chipBg }}
            />
          ))}
        </div>
      )}

      {details?.found && details.genres?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 motion-safe:animate-[richFadeIn_.3s_ease-out_forwards]">
          {details.genres.map((g) => (
            <span
              key={g}
              className="text-[9.5px] font-black uppercase tracking-wide px-2 py-1 rounded"
              style={{ background: theme.chipBg, color: theme.textFaint }}
            >
              {g}
            </span>
          ))}
        </div>
      )}

      {details?.found && details.description && (
        <p
          className="text-[12.5px] leading-relaxed motion-safe:animate-[richFadeIn_.3s_ease-out_forwards]"
          style={{ color: theme.textDim }}
        >
          {details.description}
        </p>
      )}

      {details?.found && details.movie?.mp4 && (
        <video
          controls
          poster={details.movie.thumbnail}
          className="w-full rounded-sm motion-safe:animate-[richFadeIn_.3s_ease-out_forwards]"
        >
          <source src={details.movie.mp4} type="video/mp4" />
        </video>
      )}

      {details?.found && details.screenshots?.length > 0 && (
        <div className="flex gap-2 overflow-x-auto motion-safe:animate-[richFadeIn_.3s_ease-out_forwards] pb-1">
          {details.screenshots.map((s) => (
            <img
              key={s.thumb}
              src={s.thumb}
              alt=""
              className="h-16 rounded-sm shrink-0 border"
              style={{ borderColor: theme.chipBorder }}
            />
          ))}
        </div>
      )}

      <a
        href={`https://store.steampowered.com/app/${game.appid}`}
        target="_blank"
        rel="noopener noreferrer"
        className="tap-target relative flex items-center justify-center gap-2 text-[13px] font-black px-3 py-3 rounded-sm uppercase tracking-wide overflow-hidden group/btn transition-transform duration-150 hover:scale-[1.02] active:scale-95"
        style={{ background: glow, color: "#051622" }}
      >
        <SiSteam size={16} className="relative z-10" />
        <span className="relative z-10">Open on Steam ↗</span>
        <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.5),transparent)]" />
      </a>
    </div>
  );
}

export default function SteamConnect() {
  const { theme } = useTheme();
  const {
    connected,
    connect,
    disconnect,
    useMockData,
    status,
    error,
    isWishlisted,
    wishlistGames,
    libraryGames,
    libraryPublic,
    steamid,
    playerProfile,
  } = useSteam();
  const { giveaways } = useGiveaways();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("matches"); // matches | wishlist | library
  const [input, setInput] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null); // drill-down detail for wishlist/library

  const matches =
    connected && status === "success"
      ? giveaways.filter((g) =>
          isWishlisted(
            extractSteamAppId(g.open_giveaway_url || g.gamerpower_url),
          ),
        )
      : [];
  const matchAppIds = new Set(
    matches.map((g) =>
      extractSteamAppId(g.open_giveaway_url || g.gamerpower_url),
    ),
  );

  const handleConnect = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    connect(input);
    setInput("");
  };

  const TABS = [
    { key: "matches", label: `Matches (${matches.length})` },
    { key: "wishlist", label: `Wishlist (${wishlistGames.length})` },
    { key: "library", label: `Library (${libraryGames.length})` },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="tap-target relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 cursor-pointer text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
        style={
          connected
            ? {
                borderColor: "#2fb4ff",
                color: "#2fb4ff",
                background: "#2fb4ff1a",
                animation: "steamBreathe 2.4s ease-in-out infinite",
              }
            : {
                borderColor: theme.chipBorder,
                color: theme.chipText,
                background: theme.chipBg,
              }
        }
      >
        <style>{`
          @keyframes steamBreathe { 0%,100% { box-shadow: 0 0 10px #2fb4ff44 } 50% { box-shadow: 0 0 18px #2fb4ffaa } }
          @keyframes radarPing { 0% { transform: scale(1); opacity: 0.7 } 100% { transform: scale(2.2); opacity: 0 } }
        `}</style>
        <SiSteam size={13} />
        <span className="hidden sm:inline">
          {connected ? "Steam connected" : "Connect Steam"}
        </span>
        {matches.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
            <span
              className="absolute inset-0 rounded-full motion-safe:[animation:radarPing_1.6s_ease-out_infinite]"
              style={{ background: "#fbbf24" }}
            />
            <span
              className="relative min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black"
              style={{ background: "#fbbf24", color: "#151517" }}
            >
              {matches.length}
            </span>
          </span>
        )}
      </button>

      {open &&
        createPortal(
          // Portaled to document.body — Nav's backdrop-blur makes it the
          // containing block for `position: fixed` descendants otherwise,
          // which mispositions this modal. Same root cause/fix as the
          // sort-dropdown bug from earlier.
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center px-4 motion-safe:opacity-0 motion-safe:animate-[fadeIn_.2s_ease-out_forwards]"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => {
              setOpen(false);
              setSelectedGame(null);
            }}
          >
            <style>{`
              @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
              @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
              @keyframes borderSpin { to { transform: rotate(360deg) } }
              @keyframes shimmerSweep { 0% { transform: translateX(-100%) } 100% { transform: translateX(250%) } }
            `}</style>
            <motion.div
              className="relative w-full max-h-[85vh] p-[2px] motion-safe:opacity-0 motion-safe:animate-[modalIn_.25s_ease-out_forwards]"
              style={{
                clipPath:
                  "polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)",
                boxShadow: "0 25px 60px -15px rgba(0,0,0,0.6)",
              }}
              animate={{ maxWidth: selectedGame ? "48rem" : "32rem" }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`absolute ${(connected && tab === "matches") || (connected && tab === "library") || (connected && tab === "wishlist") ? "-inset-[80%]" : "-inset-[75%]"} motion-safe:[animation:borderSpin_6s_linear_infinite]`}
                style={{
                  background:
                    "conic-gradient(from 0deg, #2fb4ff, #a855f7, #fbbf24, #2fb4ff)",
                }}
              />
              <div
                className="relative w-full h-full max-h-[calc(85vh-4px)] flex flex-col overflow-hidden backdrop-blur-xl transition-colors duration-500 ease-in-out"
                style={{
                  background:
                    status === "success" ? theme.loadedPanelBg : theme.panelBg,
                  clipPath:
                    "polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)",
                }}
              >
                <div className="relative overflow-hidden shrink-0">
                  <div
                    className="absolute inset-x-0 top-0 h-16 opacity-[0.08] pointer-events-none motion-safe:animate-scan"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent, #2fb4ff, transparent)",
                    }}
                  />
                  <div className="relative flex items-center justify-between p-5 pb-3 shrink-0">
                    {connected && playerProfile ? (
                      <div className="flex items-center gap-2.5 min-w-0">
                        {playerProfile.avatar ? (
                          <img
                            src={playerProfile.avatar}
                            alt=""
                            className="w-8 h-8 rounded-sm shrink-0 border"
                            style={{ borderColor: "#2fb4ff77" }}
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-sm shrink-0 flex items-center justify-center"
                            style={{ background: theme.chipBg }}
                          >
                            <SiSteam
                              size={16}
                              style={{ color: theme.textFaint }}
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h2
                            className="text-sm font-black leading-tight truncate"
                            style={{ color: theme.text }}
                          >
                            {playerProfile.personaname || "Connect Steam"}
                          </h2>
                          <span
                            className="text-[9.5px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded inline-block mt-0.5"
                            style={
                              playerProfile.visibility === "public"
                                ? { background: "#4bdc3d22", color: "#4bdc3d" }
                                : { background: "#fbbf2422", color: "#fbbf24" }
                            }
                          >
                            {playerProfile.visibility === "public"
                              ? "Public profile"
                              : playerProfile.visibility === "friendsonly"
                                ? "Friends-only profile"
                                : playerProfile.visibility === "private"
                                  ? "Private profile"
                                  : "Visibility unknown"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <h2
                        className="text-sm font-black uppercase tracking-wide flex items-center gap-2"
                        style={{ color: theme.text }}
                      >
                        <SiSteam size={16} />
                        Connect Steam
                      </h2>
                    )}
                    <button
                      onClick={() => {
                        setOpen(false);
                        setSelectedGame(null);
                      }}
                      className="transition-transform duration-150 hover:scale-125 hover:rotate-90 shrink-0 cursor-pointer"
                      style={{ color: theme.textFaint }}
                      aria-label="Close"
                    >
                      <LuX size={18} />
                    </button>
                  </div>
                  {status === "loading" && (
                    <div
                      className="relative h-[2px] w-full overflow-hidden"
                      style={{ background: theme.chipBg }}
                    >
                      <div
                        className="absolute inset-y-0 w-1/3 motion-safe:[animation:shimmerSweep_1.2s_ease-in-out_infinite]"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent, #2fb4ff, transparent)",
                        }}
                      />
                    </div>
                  )}
                </div>

                {connected ? (
                  <div className="flex flex-col flex-1 min-h-0">
                    {status === "loading" && (
                      <div className="px-5 pb-4">
                        <p
                          className="text-[12.5px] my-3"
                          style={{ color: theme.textDim }}
                        >
                          Fetching your wishlist and library…
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <TileSkeleton key={i} index={i} />
                          ))}
                        </div>
                      </div>
                    )}
                    {status === "error" && (
                      <div className="px-5 pb-4 flex flex-col gap-2">
                        <p
                          className="text-[12.5px]"
                          style={{ color: theme.textDim }}
                        >
                          Couldn't load your data: {error}
                        </p>
                        {import.meta.env.DEV && (
                          <button
                            onClick={useMockData}
                            className="text-[11px] font-bold underline self-start"
                            style={{ color: theme.textFaint }}
                          >
                            Preview with sample data instead (dev only)
                          </button>
                        )}
                      </div>
                    )}

                    {status === "success" && (
                      <>
                        {libraryPublic === false && (
                          <p
                            className="text-[11px] px-5 pb-2"
                            style={{ color: "#fbbf24" }}
                          >
                            Your game details are private, so your library can't
                            be checked — only the wishlist works right now.
                          </p>
                        )}

                        <div
                          className="relative grid grid-cols-3 gap-1 mx-5 mb-3 p-1 rounded-sm shrink-0"
                          style={{ background: theme.chipBg }}
                        >
                          <div
                            className="absolute top-1 bottom-1 rounded-sm transition-transform duration-300 ease-out"
                            style={{
                              left: 4,
                              width: "calc((100% - 12px) / 3)",
                              transform: `translateX(${TABS.findIndex((t) => t.key === tab) * 100}%)`,
                              background: "#2fb4ff",
                              boxShadow: "0 0 10px #2fb4ff77",
                            }}
                          />
                          {TABS.map((t) => (
                            <button
                              key={t.key}
                              onClick={() => {
                                setTab(t.key);
                                setSelectedGame(null);
                              }}
                              className="relative z-10 text-[11px] font-black uppercase tracking-wide px-2 py-1.5 rounded-sm whitespace-nowrap transition-colors duration-200"
                              style={{
                                color:
                                  tab === t.key ? "#051622" : theme.chipText,
                              }}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {/* key={tab} forces a remount on tab switch, which
                          replays the entrance animation on the new
                          content — a cheap, reliable crossfade trick
                          instead of managing enter/exit transition state. */}
                        <div
                          key={tab}
                          className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 motion-safe:opacity-0 motion-safe:animate-[fadeIn_.25s_ease-out_forwards]"
                        >
                          {tab === "matches" && (
                            <div className="flex flex-col gap-1.5">
                              {matches.length === 0 && (
                                <p
                                  className="text-[12px]"
                                  style={{ color: theme.textDim }}
                                >
                                  Nothing on your wishlist is in the current
                                  giveaway list right now.
                                </p>
                              )}
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
                                  className="tap-target motion-safe:opacity-0 motion-safe:animate-card-in flex items-center justify-between gap-2 px-3 py-2.5 border transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_14px_#fbbf2466]"
                                >
                                  <span
                                    className="text-[12.5px] font-bold leading-snug line-clamp-1"
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
                          )}

                          {tab === "wishlist" && (
                            <AnimatePresence mode="wait">
                              {selectedGame ? (
                                <motion.div
                                  key={`detail-${selectedGame.appid}`}
                                  initial={{ opacity: 0, x: 24 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -24 }}
                                  transition={{ duration: 0.25 }}
                                >
                                  <GameDetailView
                                    game={selectedGame}
                                    theme={theme}
                                    highlight={matchAppIds.has(
                                      selectedGame.appid,
                                    )}
                                    onBack={() => setSelectedGame(null)}
                                  />
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="wishlist-grid"
                                  initial={{ opacity: 0, x: -24 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 24 }}
                                  transition={{ duration: 0.25 }}
                                  className="grid grid-cols-2 gap-2"
                                >
                                  {wishlistGames.length === 0 && (
                                    <p
                                      className="text-[12px] col-span-2"
                                      style={{ color: theme.textDim }}
                                    >
                                      {playerProfile &&
                                      playerProfile.visibility !== "public"
                                        ? `Your Steam profile is set to ${playerProfile.visibility === "private" ? "private" : "friends-only"} — wishlist and library can't be read until it's public.`
                                        : libraryPublic === false
                                          ? 'Your profile is public, but "Game details" is set to private/friends-only in your Steam privacy settings — that\'s the specific toggle wishlist and library both need.'
                                          : "Your wishlist is empty."}
                                    </p>
                                  )}
                                  {wishlistGames.map((g, i) => (
                                    <GameTile
                                      key={g.appid}
                                      {...g}
                                      theme={theme}
                                      highlight={matchAppIds.has(g.appid)}
                                      index={i}
                                      onSelect={setSelectedGame}
                                    />
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          )}

                          {tab === "library" && (
                            <AnimatePresence mode="wait">
                              {selectedGame ? (
                                <motion.div
                                  key={`detail-${selectedGame.appid}`}
                                  initial={{ opacity: 0, x: 24 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -24 }}
                                  transition={{ duration: 0.25 }}
                                >
                                  <GameDetailView
                                    game={selectedGame}
                                    theme={theme}
                                    highlight={matchAppIds.has(
                                      selectedGame.appid,
                                    )}
                                    onBack={() => setSelectedGame(null)}
                                  />
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="library-grid"
                                  initial={{ opacity: 0, x: -24 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 24 }}
                                  transition={{ duration: 0.25 }}
                                  className="grid grid-cols-2 gap-2"
                                >
                                  {libraryGames.length === 0 && (
                                    <p
                                      className="text-[12px] col-span-2"
                                      style={{ color: theme.textDim }}
                                    >
                                      {libraryPublic === false
                                        ? "Game details are private."
                                        : "No games found."}
                                    </p>
                                  )}
                                  {libraryGames.map((g, i) => (
                                    <GameTile
                                      key={g.appid}
                                      {...g}
                                      theme={theme}
                                      index={i}
                                      onSelect={setSelectedGame}
                                    />
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          )}
                        </div>
                      </>
                    )}

                    <div
                      className="p-5 pt-3 shrink-0 flex flex-col gap-2"
                      style={{ borderTop: `1px solid ${theme.panelBorder}` }}
                    >
                      {steamid && steamid !== "MOCK" && (
                        <a
                          href={`https://steamcommunity.com/profiles/${steamid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tap-target w-full text-center text-[12px] font-bold px-3 py-2 rounded-sm border-2 transition-all duration-200 hover:scale-[1.02]"
                          style={{
                            borderColor: "#2fb4ff",
                            color: "#2fb4ff",
                            background: "#2fb4ff14",
                          }}
                        >
                          View my real Steam profile ↗
                        </a>
                      )}
                      <button
                        onClick={() => {
                          disconnect();
                          setOpen(false);
                        }}
                        className="tap-target cursor-pointer w-full text-[12px] font-bold px-3 py-2 rounded-sm border-2 transition-all duration-200 hover:scale-[1.02]"
                        style={{
                          borderColor: theme.chipBorder,
                          color: theme.chipText,
                          background: theme.chipBg,
                        }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 p-5 pt-0">
                    <p
                      className="text-[12px] leading-snug"
                      style={{ color: theme.textDim }}
                    >
                      Your profile's wishlist and game details need to be set to{" "}
                      <strong>public</strong> for this to work. Nothing is
                      stored except your SteamID, in your browser only — we
                      never see your password.
                    </p>

                    <a
                      href="/api/auth/steam-login"
                      className="tap-target relative flex items-center justify-center gap-2 text-[13px] font-black px-3 py-3 rounded-sm uppercase tracking-wide overflow-hidden group/btn transition-transform duration-150 hover:scale-[1.02] active:scale-95"
                      style={{
                        background: "#2fb4ff",
                        color: "#051622",
                        animation: "steamGlow 2.2s ease-in-out infinite",
                      }}
                    >
                      <style>{`@keyframes steamGlow { 0%,100% { box-shadow: 0 4px 18px -4px #2fb4ff88 } 50% { box-shadow: 0 4px 26px -2px #2fb4ffdd } }`}</style>
                      <SiSteam size={16} className="relative z-10" />
                      <span className="relative z-10">
                        Sign in through Steam
                      </span>
                      <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.5),transparent)]" />
                    </a>
                    {import.meta.env.DEV && (
                      <p
                        className="text-[10.5px]"
                        style={{ color: theme.textFaint }}
                      >
                        Note: sign-in only works on the deployed site or via
                        `vercel dev` — plain `npm run dev` can't run the /api
                        redirect this needs.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowManual((v) => !v)}
                      className="text-[11px] font-bold underline self-start transition-opacity duration-150 hover:opacity-70 cursor-pointer"
                      style={{ color: theme.textFaint }}
                    >
                      {showManual
                        ? "Hide manual entry"
                        : "Or enter your SteamID manually"}
                    </button>

                    {showManual && (
                      <form
                        onSubmit={handleConnect}
                        className="flex flex-col gap-3 motion-safe:opacity-0 motion-safe:animate-[fadeIn_.2s_ease-out_forwards]"
                      >
                        <input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="e.g. 76561198012345678 or your profile name"
                          className="tap-target px-3 py-2.5 text-[13px] rounded-sm border-2 outline-none transition-colors duration-150 focus:border-[#2fb4ff]"
                          style={{
                            background: theme.chipBg,
                            borderColor: theme.chipBorder,
                            color: theme.text,
                          }}
                        />
                        <button
                          type="submit"
                          className="tap-target cursor-pointer text-[12.5px] font-black px-3 py-2.5 rounded-sm uppercase tracking-wide border-2 transition-transform duration-150 hover:scale-[1.02] active:scale-95"
                          style={{
                            borderColor: theme.chipBorder,
                            color: theme.chipText,
                            background: theme.chipBg,
                          }}
                        >
                          Connect
                        </button>
                        <p
                          className="text-[10.5px]"
                          style={{ color: theme.textFaint }}
                        >
                          Find your SteamID64 at{" "}
                          <a
                            href="https://steamid.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            steamid.io
                          </a>{" "}
                          if you're not sure what it is.
                        </p>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  );
}
