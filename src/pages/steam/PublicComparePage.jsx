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
              borderColor: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              color: "#fff",
            }}
          >
            {body}
            <p className="mt-5 text-[11px]" style={{ color: pt.textFaint }}>
              Both Steam profiles need to be public for this to work.{" "}
              <Link to="/steam" className="underline">
                See your own profile
              </Link>
            </p>
          </div>
        </ThemeContext.Provider>
      </main>
    </div>
  );
}
