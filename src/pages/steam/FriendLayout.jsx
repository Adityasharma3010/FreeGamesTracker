import React, { useEffect } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useParams,
  useNavigate,
} from "react-router-dom";
import {
  ThemeContext,
  buildTheme,
  useTheme,
} from "../../context/ThemeContext.jsx";
import { useSteam } from "../../context/SteamContext.jsx";
import { useSteamProfileData } from "../../hooks/useSteamProfileData.js";
import { useMatchesFor } from "../../hooks/useMatchesFor.js";
import Nav from "../../components/Nav.jsx";
import AmbientBackground from "../../components/AmbientBackground.jsx";
import { SiSteam } from "react-icons/si";
import { LuArrowLeft, LuExternalLink } from "react-icons/lu";

// Same fixed, full-bleed background treatment as the signed-in-user's own
// SteamLayout — just fed the FRIEND's equipped background instead.
function SteamPageBackground({ bg }) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
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

// Viewing a friend's Steam data in-app — separate from the signed-in
// user's own SteamLayout so browsing a friend's profile can never touch
// your own connected account (no shared fetch state, no localStorage
// writes). Everything here is read via useSteamProfileData(steamid),
// which hits the same public endpoints api/steam.js already exposes for
// any steamid — no login required to view a public friend profile.
export default function FriendLayout() {
  const { steamid } = useParams();
  const navigate = useNavigate();
  const themeCtx = useTheme();
  const { theme } = themeCtx;
  const { connected: viewerConnected } = useSteam();
  const steam = useSteamProfileData(steamid);
  const { matches, matchAppIds } = useMatchesFor(
    steam.wishlistGames,
    steam.status === "success",
  );
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const bg = steam.equipped?.background;
  const hasBg = !!bg && !!(bg.image || bg.webm || bg.mp4);
  const modifier = steam.equipped?.profileModifier;

  const base = `/steam/friend/${steamid}`;
  const tabs = [
    { to: base, label: "Profile", end: true },
    {
      to: `${base}/wishlist`,
      label: `Wishlist (${steam.wishlistGames.length})`,
    },
    { to: `${base}/library`, label: `Library (${steam.libraryGames.length})` },
    { to: `${base}/matches`, label: `Matches (${matches.length})` },
  ];

  const panelTheme = { ...themeCtx, dark: true, theme: buildTheme(true) };
  const name = steam.playerProfile?.personaname;

  return (
    <div
      className="min-h-screen font-sans theme-transition relative"
      style={{ background: theme.pageBg, color: theme.text }}
    >
      {hasBg ? <SteamPageBackground bg={bg} /> : <AmbientBackground />}
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
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
            <div className="relative flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    viewerConnected ? navigate("/steam") : navigate(-1)
                  }
                  className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide cursor-pointer transition-transform duration-150 hover:-translate-x-0.5"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  <LuArrowLeft size={13} />
                  {viewerConnected ? "Back to your profile" : "Back"}
                </button>
                {steamid && steamid !== "MOCK" && (
                  <a
                    href={`https://steamcommunity.com/profiles/${steamid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide transition-opacity hover:opacity-70"
                    style={{ color: "#2fb4ff" }}
                  >
                    <LuExternalLink size={13} /> Open {name || "profile"} on
                    Steam
                  </a>
                )}
              </div>

              <div
                className="flex gap-1 p-1 rounded-sm overflow-x-auto"
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
              <Outlet context={{ steam, matches, matchAppIds }} />
            </div>
          </div>
        </ThemeContext.Provider>
      </main>
    </div>
  );
}
