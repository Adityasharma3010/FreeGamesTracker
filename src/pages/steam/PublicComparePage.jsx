import React, { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ThemeContext,
  buildTheme,
  useTheme,
} from "../../context/ThemeContext.jsx";
import { useSteamProfileData } from "../../hooks/useSteamProfileData.js";
import Nav from "../../components/Nav.jsx";
import AmbientBackground from "../../components/AmbientBackground.jsx";
import CompareView from "../../components/CompareView.jsx";
import CopyLinkButton from "../../components/CopyLinkButton.jsx";
import { TileSkeleton } from "../../components/SteamConnect.jsx";

const STEAMID64 = /^\d{17}$/;

// A shareable "A vs B" page: /steam/compare/:a/:b. Both players come from
// the URL, so anyone can open the link — no sign-in needed and it doesn't
// depend on who is viewing. Both profiles must be public on Steam.
export default function PublicComparePage() {
  const { a, b } = useParams();
  const navigate = useNavigate();
  const themeCtx = useTheme();
  const { theme } = themeCtx;
  const valid = STEAMID64.test(a || "") && STEAMID64.test(b || "") && a !== b;
  const A = useSteamProfileData(valid ? a : null);
  const B = useSteamProfileData(valid ? b : null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [a, b]);

  // Same always-dark Steam panel treatment as the other Steam pages.
  const panelTheme = { ...themeCtx, dark: true, theme: buildTheme(true) };
  const pt = panelTheme.theme;

  let body;
  const loading = (s) => s === "loading" || s === "idle";
  if (!valid) {
    body = (
      <p className="text-[13px]" style={{ color: pt.textDim }}>
        This compare link doesn't look right. It needs two different Steam IDs.
      </p>
    );
  } else if (loading(A.status) || loading(B.status)) {
    body = (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <TileSkeleton key={i} index={i} />
        ))}
      </div>
    );
  } else if (A.status === "error" || B.status === "error") {
    body = (
      <p className="text-[13px]" style={{ color: pt.textDim }}>
        Couldn't load the data to compare: {A.error || B.error}
      </p>
    );
  } else {
    const hidden = (s) =>
      s.libraryPublic === false || s.libraryGames.length === 0;
    body = (
      <CompareView
        theme={pt}
        me={{
          steamid: a,
          name: A.playerProfile?.personaname || "Player 1",
          avatar: A.playerProfile?.avatar,
          level: A.equipped?.level,
          library: A.libraryGames,
          wishlist: A.wishlistGames,
          libraryHidden: hidden(A),
        }}
        them={{
          steamid: b,
          name: B.playerProfile?.personaname || "Player 2",
          avatar: B.playerProfile?.avatar,
          level: B.equipped?.level,
          library: B.libraryGames,
          wishlist: B.wishlistGames,
          libraryHidden: hidden(B),
        }}
        onOpenGame={({ appid }) => navigate(`/steam/friend/${b}/game/${appid}`)}
        actions={
          <CopyLinkButton theme={pt} path={`/steam/compare/${a}/${b}`} />
        }
      />
    );
  }

  return (
    <div
      className="min-h-screen font-sans theme-transition relative"
      style={{ background: theme.pageBg, color: theme.text }}
    >
      <AmbientBackground />
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 relative z-10">
        <ThemeContext.Provider value={panelTheme}>
          <div
            className="max-w-[1000px] mx-auto p-3 sm:p-5 border relative"
            style={{
              background: "rgba(8,10,16,0.62)",
              boxShadow:
                "0 0 90px rgba(47,180,255,0.08), 0 0 90px rgba(232,121,249,0.08)",
              borderColor: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              color: "#fff",
            }}
          >
            {valid && (
              <p
                className="mb-3 text-[10.5px] font-black uppercase tracking-[0.2em]"
                style={{
                  background: "linear-gradient(90deg, #2fb4ff, #e879f9)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  width: "fit-content",
                }}
              >
                Steam library comparison
              </p>
            )}
            {body}
            <div
              className="mt-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                background:
                  "linear-gradient(90deg, rgba(47,180,255,0.1), rgba(232,121,249,0.1))",
              }}
            >
              <div>
                <div className="text-[13px] font-black text-white">
                  Curious how your library stacks up?
                </div>
                <div className="text-[11px]" style={{ color: pt.textDim }}>
                  Sign in with Steam and compare with any friend. Both profiles
                  need to be public.
                </div>
              </div>
              <Link
                to="/steam"
                className="tap-target shrink-0 text-[10.5px] font-black uppercase tracking-wide px-4 py-2 transition-[filter] duration-150 hover:brightness-110"
                style={{ background: "#2fb4ff", color: "#06121c" }}
              >
                Compare yours
              </Link>
            </div>
          </div>
        </ThemeContext.Provider>
      </main>
    </div>
  );
}
