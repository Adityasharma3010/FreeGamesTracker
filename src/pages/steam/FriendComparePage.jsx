import React, { useEffect, useState } from "react";
import { LuUsers } from "react-icons/lu";
import FriendPicker from "../../components/FriendPicker.jsx";
import CompareView from "../../components/CompareView.jsx";
import CopyLinkButton from "../../components/CopyLinkButton.jsx";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";
import { rememberFriend } from "../../lib/steamRecentFriends.js";
import { useSteam } from "../../context/SteamContext.jsx";
import { TileSkeleton } from "../../components/SteamConnect.jsx";

// Your library/wishlist vs the friend's, using data both pages already
// loaded — no extra requests. Only reachable when you're signed in (the
// tab is hidden otherwise, see FriendLayout). The actual comparison UI
// lives in CompareView so the shareable /steam/compare/:a/:b page can
// reuse it.
export default function FriendComparePage() {
  const { steamid } = useParams();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const own = useSteam();
  const { steam } = useOutletContext();
  const [picking, setPicking] = useState(false);

  // Remember who you compared with (powers the "Compare with <name>"
  // shortcut and the Recent list in the friend picker).
  const friendName = steam.playerProfile?.personaname;
  const friendAvatar = steam.playerProfile?.avatar;
  useEffect(() => {
    if (own.connected && own.steamid && friendName) {
      rememberFriend(own.steamid, {
        steamid,
        name: friendName,
        avatar: friendAvatar,
      });
    }
  }, [own.connected, own.steamid, steamid, friendName, friendAvatar]);

  if (!own.connected) {
    return (
      <p className="text-[13px]" style={{ color: theme.textDim }}>
        Sign in with your Steam account to compare your games with theirs.
      </p>
    );
  }

  const loading = (s) => s === "loading" || s === "idle";
  if (loading(own.status) || loading(steam.status)) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <TileSkeleton key={i} index={i} />
        ))}
      </div>
    );
  }
  if (own.status === "error" || steam.status === "error") {
    return (
      <p className="text-[13px]" style={{ color: theme.textDim }}>
        Couldn't load the data to compare: {own.error || steam.error}
      </p>
    );
  }

  const name = steam.playerProfile?.personaname || "them";
  const theirLibraryHidden =
    steam.libraryPublic === false || steam.libraryGames.length === 0;

  return (
    <>
      <CompareView
        selfMode
        theme={theme}
        me={{
          steamid: own.steamid,
          name: own.playerProfile?.personaname || "You",
          avatar: own.playerProfile?.avatar,
          level: own.equipped?.level,
          library: own.libraryGames,
          wishlist: own.wishlistGames,
          libraryHidden: false,
        }}
        them={{
          steamid,
          name,
          avatar: steam.playerProfile?.avatar,
          level: steam.equipped?.level,
          library: steam.libraryGames,
          wishlist: steam.wishlistGames,
          libraryHidden: theirLibraryHidden,
        }}
        onOpenGame={({ appid }) =>
          navigate(`/steam/friend/${steamid}/game/${appid}`)
        }
        actions={
          <>
            <CopyLinkButton
              theme={theme}
              path={`/steam/compare/${own.steamid}/${steamid}`}
            />
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="tap-target shrink-0 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border cursor-pointer transition-colors duration-150 hover:bg-white/10"
              style={{
                borderColor: theme.surfaceBorder,
                color: theme.textFaint,
              }}
            >
              <LuUsers size={12} /> Switch friend
            </button>
          </>
        }
      />
      {picking && (
        <FriendPicker
          steamid={own.steamid}
          excludeSteamid={steamid}
          theme={theme}
          onClose={() => setPicking(false)}
          onSelect={(friendSteamid) =>
            navigate(`/steam/friend/${friendSteamid}/compare`)
          }
        />
      )}
    </>
  );
}
