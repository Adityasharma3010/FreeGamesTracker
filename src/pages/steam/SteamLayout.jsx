import React, { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ThemeContext,
  buildTheme,
  useTheme,
} from "../../context/ThemeContext.jsx";
import { useSteam } from "../../context/SteamContext.jsx";
import { useSteamMatches } from "../../hooks/useSteamMatches.js";
import Nav from "../../components/Nav.jsx";
import AmbientBackground from "../../components/AmbientBackground.jsx";
import { SiSteam } from "react-icons/si";

function SignInPrompt({ theme }) {
  return (
    <div className="max-w-md mx-auto text-center flex flex-col items-center gap-4 py-16">
      <SiSteam size={40} style={{ color: "#2fb4ff" }} />
      <h1 className="text-xl font-black" style={{ color: theme.text }}>
        Connect your Steam account
      </h1>
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: theme.textDim }}
      >
        Sign in to see your profile, wishlist, library and which of your
        wishlisted games are free right now. Your wishlist and game details need
        to be public on Steam.
      </p>
      <a
        href="/api/auth/steam-login"
        className="tap-target flex items-center gap-2 text-[13px] font-black px-5 py-3 rounded-sm uppercase tracking-wide transition-transform duration-150 hover:scale-[1.03] active:scale-95"
        style={{ background: "#2fb4ff", color: "#051622" }}
      >
        <SiSteam size={16} /> Sign in through Steam
      </a>
    </div>
  );
}

// The user's OWN equipped Steam profile background, fixed behind the whole
// page like on steamcommunity.com.
function SteamPageBackground({ bg }) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // Full-size webm/mp4 — the *_small variants Steam provides are
  // noticeably softer and were the "still looks low quality" bug even
  // after the CDN fix. A fixed full-bleed background can afford the
  // bigger file, and the poster (shown until the video loads, and
  // permanently for reduced-motion users) is the full-quality still too.
  const webm = bg.webm;
  const mp4 = bg.mp4;
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      {(webm || mp4) && !reduce ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={bg.image || undefined}
          className="w-full h-full object-cover"
        >
          {webm && <source src={webm} type="video/webm" />}
          {mp4 && <source src={mp4} type="video/mp4" />}
        </video>
      ) : bg.image ? (
        <img src={bg.image} alt="" className="w-full h-full object-cover" />
      ) : null}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.5))",
        }}
      />
    </div>
  );
}

export default function SteamLayout() {
  const themeCtx = useTheme();
  const { theme } = themeCtx;
  const { connected, equipped, wishlistGames, libraryGames } = useSteam();
  const { matches } = useSteamMatches();
  const { pathname } = useLocation();

  // New route = start at the top, like a real page load.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const bg = equipped?.background;
  const hasBg = connected && !!bg && !!(bg.image || bg.webm || bg.mp4);
  const modifier = equipped?.profileModifier;

  const tabs = [
    { to: "/steam", label: "Profile", end: true },
    { to: "/steam/wishlist", label: `Wishlist (${wishlistGames.length})` },
    { to: "/steam/library", label: `Library (${libraryGames.length})` },
    { to: "/steam/matches", label: `Matches (${matches.length})` },
  ];

  // Everything inside the Steam panel is rendered against the DARK tokens
  // regardless of the site's light/dark toggle — like Steam itself, the
  // panel is always a dark, translucent layer over the user's background.
  const panelTheme = { ...themeCtx, dark: true, theme: buildTheme(true) };

  return (
    <div
      className="min-h-screen font-sans theme-transition relative"
      style={{ background: theme.pageBg, color: theme.text }}
    >
      {hasBg ? <SteamPageBackground bg={bg} /> : <AmbientBackground />}
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
        {!connected ? (
          <SignInPrompt theme={theme} />
        ) : (
          <ThemeContext.Provider value={panelTheme}>
            <div
              className="max-w-[1000px] mx-auto p-3 sm:p-5 border relative overflow-hidden"
              style={{
                background: "rgba(8,10,16,0.62)",
                borderColor: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: "#fff",
              }}
            >
              {/* The user's equipped profile modifier/theme, applied as an
                  ambient wash behind the panel content — Steam re-skins the
                  whole profile per modifier, but the API only exposes its
                  preview art, so this approximates it rather than reproducing
                  the real skin. */}
              {modifier?.image && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `url(${modifier.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.16,
                    mixBlendMode: "screen",
                  }}
                  aria-hidden="true"
                />
              )}
              <div className="relative">
                <div
                  className="flex gap-1 p-1 mb-4 rounded-sm overflow-x-auto"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {tabs.map((t) => (
                    <NavLink
                      key={t.to}
                      to={t.to}
                      end={t.end}
                      className="text-[11px] font-black uppercase tracking-wide px-3 py-2 rounded-sm whitespace-nowrap transition-colors duration-200"
                      style={({ isActive }) =>
                        isActive
                          ? {
                              background: "#2fb4ff",
                              color: "#051622",
                              boxShadow: "0 0 10px #2fb4ff77",
                            }
                          : { color: "rgba(255,255,255,0.75)" }
                      }
                    >
                      {t.label}
                    </NavLink>
                  ))}
                </div>
                <Outlet />
              </div>
            </div>
          </ThemeContext.Provider>
        )}
      </main>
    </div>
  );
}
