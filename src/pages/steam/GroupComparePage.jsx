import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ThemeContext,
  buildTheme,
  useTheme,
} from "../../context/ThemeContext.jsx";
import { useSteamProfileData } from "../../hooks/useSteamProfileData.js";
import { MAX_GROUP_PLAYERS } from "../../lib/steamGroupCompare.js";
import Nav from "../../components/Nav.jsx";
import AmbientBackground from "../../components/AmbientBackground.jsx";
import GroupCompareView from "../../components/GroupCompareView.jsx";
import CopyLinkButton from "../../components/CopyLinkButton.jsx";
import { TileSkeleton } from "../../components/SteamConnect.jsx";

const STEAMID64 = /^\d{17}$/;

// Loads ONE player and reports it upward. One of these per player (keyed
// by steamid), so the number of players can vary without breaking React's
// rules about hooks.
function PlayerLoader({ steamid, onData }) {
  const d = useSteamProfileData(steamid);
  useEffect(() => {
    onData(steamid, d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    steamid,
    d.status,
    d.error,
    d.playerProfile,
    d.equipped,
    d.libraryPublic,
    d.libraryGames,
    d.wishlistGames,
  ]);
  return null;
}

// A shareable "everyone vs everyone" page: /steam/group/<id>,<id>,<id>…
// (3 to 6 players). Like the two-player share link, all players come from
// the URL, so anyone can open it — no sign-in. Profiles must be public.
export default function GroupComparePage() {
  const { ids: rawIds } = useParams();
  const navigate = useNavigate();
  const themeCtx = useTheme();
  const { theme } = themeCtx;
  const [loaded, setLoaded] = useState({});

  const ids = useMemo(() => {
    const list = String(rawIds || "")
      .split(",")
      .map((s) => s.trim());
    return [...new Set(list)];
  }, [rawIds]);
  const valid =
    ids.length >= 3 &&
    ids.length <= MAX_GROUP_PLAYERS &&
    ids.every((id) => STEAMID64.test(id));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [rawIds]);

  const onData = (id, d) => setLoaded((l) => ({ ...l, [id]: d }));

  const panelTheme = { ...themeCtx, dark: true, theme: buildTheme(true) };
  const pt = panelTheme.theme;
  const isLoading = (d) => !d || d.status === "loading" || d.status === "idle";

  let body;
  if (!valid) {
    body = (
      <p className="text-[13px]" style={{ color: pt.textDim }}>
        This group link doesn't look right. It needs 3 to {MAX_GROUP_PLAYERS}{" "}
        different Steam IDs separated by commas.
      </p>
    );
  } else if (ids.some((id) => isLoading(loaded[id]))) {
    body = (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <TileSkeleton key={i} index={i} />
        ))}
      </div>
    );
  } else if (ids.some((id) => loaded[id].status === "error")) {
    const bad = ids.map((id) => loaded[id]).find((d) => d.status === "error");
    body = (
      <p className="text-[13px]" style={{ color: pt.textDim }}>
        Couldn't load the data to compare: {bad.error}
      </p>
    );
  } else {
    const players = ids.map((id, i) => {
      const d = loaded[id];
      return {
        steamid: id,
        name: d.playerProfile?.personaname || `Player ${i + 1}`,
        avatar: d.playerProfile?.avatar,
        level: d.equipped?.level,
        library: d.libraryGames,
        wishlist: d.wishlistGames,
        libraryHidden: d.libraryPublic === false || d.libraryGames.length === 0,
      };
    });
    body = (
      <GroupCompareView
        players={players}
        theme={pt}
        onOpenGame={({ appid }) =>
          navigate(`/steam/friend/${ids[0]}/game/${appid}`)
        }
        actions={
          <CopyLinkButton theme={pt} path={`/steam/group/${ids.join(",")}`} />
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
        {valid &&
          ids.map((id) => (
            <PlayerLoader key={id} steamid={id} onData={onData} />
          ))}
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
                Group comparison · {ids.length} players
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
                  Sign in with Steam and compare with your friends. Everyone's
                  profile needs to be public.
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
