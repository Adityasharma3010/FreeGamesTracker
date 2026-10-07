import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuUsers } from "react-icons/lu";
import FriendPicker from "../../components/FriendPicker.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useSteam } from "../../context/SteamContext.jsx";
import { useSteamMatches } from "../../hooks/useSteamMatches.js";
import { getRecentFriends } from "../../lib/steamRecentFriends.js";
import SteamProfileView from "../../components/SteamProfileView.jsx";

export default function SteamProfilePage() {
  const { theme } = useTheme();
  const steam = useSteam();
  const { matches, matchAppIds } = useSteamMatches();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  // The friend you compared with most recently (one-click shortcut).
  const lastFriend = steam.connected
    ? getRecentFriends(steam.steamid)[0]
    : null;

  return (
    <>
      {steam.connected && (
        <div className="flex flex-wrap justify-end gap-2 mb-3">
          {lastFriend && (
            <button
              type="button"
              onClick={() =>
                navigate(`/steam/friend/${lastFriend.steamid}/compare`)
              }
              className="tap-target flex items-center gap-2 max-w-[280px] text-[10.5px] font-black uppercase tracking-wide pl-1.5 pr-3 py-1 border-2 cursor-pointer transition-colors duration-150 hover:bg-white/10"
              style={{ borderColor: "#e879f9", color: "#e879f9" }}
              title={`Compare with ${lastFriend.name} again`}
            >
              {lastFriend.avatar ? (
                <img
                  src={lastFriend.avatar}
                  alt=""
                  className="w-5 h-5 object-cover shrink-0"
                />
              ) : (
                <LuUsers size={12} className="shrink-0" />
              )}
              <span className="truncate">Compare with {lastFriend.name}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="tap-target flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border-2 cursor-pointer transition-colors duration-150"
            style={{
              borderColor: "#2fb4ff",
              color: "#2fb4ff",
              background: "#2fb4ff22",
            }}
          >
            <LuUsers size={12} /> Compare with a friend
          </button>
        </div>
      )}
      {picking && (
        <FriendPicker
          steamid={steam.steamid}
          theme={theme}
          onClose={() => setPicking(false)}
          onSelect={(friendSteamid) =>
            navigate(`/steam/friend/${friendSteamid}/compare`)
          }
        />
      )}
      <SteamProfileView
        status={steam.status}
        error={steam.error}
        theme={theme}
        playerProfile={steam.playerProfile}
        equipped={steam.equipped}
        steamid={steam.steamid}
        wishlistGames={steam.wishlistGames}
        libraryGames={steam.libraryGames}
        matches={matches}
        matchAppIds={matchAppIds}
        basePath="/steam"
        gamePath={(appid) => `/steam/game/${appid}`}
        friendPath={(friendSteamid) => `/steam/friend/${friendSteamid}`}
      />
    </>
  );
}
