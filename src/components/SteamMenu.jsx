import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSteam } from "../context/SteamContext.jsx";
import { useSteamMatches } from "../hooks/useSteamMatches.js";
import SteamAvatar from "./SteamAvatar.jsx";
import {
  LuChevronDown,
  LuUser,
  LuHeart,
  LuLibrary,
  LuGift,
  LuExternalLink,
  LuLogOut,
} from "react-icons/lu";

// Shown in the Nav INSTEAD of the Connect Steam popup once the user is
// connected. Avatar + frame + name, with a dropdown that routes to the
// real Steam pages.
export default function SteamMenu() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const {
    status,
    playerProfile,
    equipped,
    steamid,
    disconnect,
    wishlistGames,
    libraryGames,
  } = useSteam();
  const { matches } = useSteamMatches();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const avatarSrc =
    equipped?.animatedAvatar?.image || playerProfile?.avatar || null;
  const items = [
    { to: "/steam", label: "Profile", icon: LuUser },
    {
      to: "/steam/wishlist",
      label: "Wishlist",
      icon: LuHeart,
      count: wishlistGames.length,
    },
    {
      to: "/steam/library",
      label: "Library",
      icon: LuLibrary,
      count: libraryGames.length,
    },
    {
      to: "/steam/matches",
      label: "Matches",
      icon: LuGift,
      count: matches.length,
      gold: matches.length > 0,
    },
  ];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={status === "loading"}
        className="tap-target relative flex items-center gap-2 pl-1.5 pr-2.5 py-1 cursor-pointer text-xs font-bold transition-[transform,box-shadow] duration-200 hover:scale-105 active:scale-95 disabled:cursor-default disabled:hover:scale-100"
        style={{
          clipPath: "polygon(0 8px,8px 0,100% 0,100% 100%,0 100%)",
          // Loading: a thin border so the shimmer skeleton reads as a
          // button. Loaded: no border — a soft glow only, which is the
          // "remove the border, make it smooth" fix.
          border:
            status === "loading"
              ? "2px solid #2fb4ff"
              : "2px solid transparent",
          color: "#2fb4ff",
          background: "#2fb4ff1a",
          boxShadow: status === "loading" ? "none" : "0 0 10px #2fb4ff33",
        }}
        onMouseEnter={(e) => {
          if (status !== "loading")
            e.currentTarget.style.boxShadow = "0 0 16px #2fb4ff77";
        }}
        onMouseLeave={(e) => {
          if (status !== "loading")
            e.currentTarget.style.boxShadow = "0 0 10px #2fb4ff33";
        }}
      >
        <style>{`@keyframes steamBreathe { 0%,100% { box-shadow: 0 0 10px #2fb4ff44 } 50% { box-shadow: 0 0 18px #2fb4ffaa } }
@keyframes steamShimmer { 0% { background-position: -80px 0 } 100% { background-position: 80px 0 } }`}</style>

        {status === "loading" ? (
          <>
            {/* Skeleton avatar block — same footprint as the real avatar
                so nothing jumps once data arrives */}
            <span
              className="w-[26px] h-[26px] shrink-0"
              style={{
                background:
                  "linear-gradient(90deg, #2fb4ff22 25%, #2fb4ff44 37%, #2fb4ff22 63%)",
                backgroundSize: "160px 100%",
                animation: "steamShimmer 1.1s linear infinite",
              }}
            />
            <span
              className="hidden sm:block w-16 h-2.5"
              style={{
                background:
                  "linear-gradient(90deg, #2fb4ff22 25%, #2fb4ff44 37%, #2fb4ff22 63%)",
                backgroundSize: "160px 100%",
                animation: "steamShimmer 1.1s linear infinite",
              }}
            />
          </>
        ) : (
          <>
            <SteamAvatar
              src={avatarSrc}
              video={equipped?.animatedAvatar}
              frame={equipped?.avatarFrame?.image}
              frameVideo={equipped?.avatarFrame}
              size={26}
            />
            <span className="hidden sm:inline max-w-[110px] truncate">
              {playerProfile?.personaname || "Steam"}
            </span>
            <LuChevronDown
              size={13}
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </>
        )}

        {status !== "loading" && matches.length > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{ background: "#fbbf24", color: "#151517" }}
          >
            {matches.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 z-50 border-2 py-1.5 backdrop-blur-xl"
            style={{
              background: theme.panelBg,
              borderColor: theme.surfaceBorder,
              boxShadow: "0 16px 40px -12px rgba(0,0,0,0.6)",
            }}
          >
            {items.map(({ to, label, icon: Icon, count, gold }) => (
              <Link
                key={to}
                to={to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-bold transition-colors duration-150 hover:bg-[#2fb4ff1f]"
                style={{ color: theme.text }}
              >
                <Icon size={14} style={{ color: "#2fb4ff" }} />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span
                    className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                    style={
                      gold
                        ? { background: "#fbbf24", color: "#151517" }
                        : { background: theme.chipBg, color: theme.textFaint }
                    }
                  >
                    {count}
                  </span>
                )}
              </Link>
            ))}

            <div
              className="my-1.5 h-px"
              style={{ background: theme.panelBorder }}
            />

            {steamid && steamid !== "MOCK" && (
              <a
                href={`https://steamcommunity.com/profiles/${steamid}`}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                className="flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-bold transition-colors duration-150 hover:bg-[#2fb4ff1f]"
                style={{ color: theme.text }}
              >
                <LuExternalLink size={14} style={{ color: "#2fb4ff" }} />
                <span className="flex-1">Steam profile</span>
              </a>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                disconnect();
                navigate("/");
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12.5px] font-bold text-left cursor-pointer transition-colors duration-150 hover:bg-[#ff616122]"
              style={{ color: theme.danger }}
            >
              <LuLogOut size={14} />
              <span className="flex-1">Log out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
