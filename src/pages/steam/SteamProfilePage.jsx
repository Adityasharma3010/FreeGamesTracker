import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuUsers } from "react-icons/lu";
import FriendPicker from "../../components/FriendPicker.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useSteam } from "../../context/SteamContext.jsx";
import { useSteamMatches } from "../../hooks/useSteamMatches.js";
import SteamProfileView from "../../components/SteamProfileView.jsx";

export default function SteamProfilePage() {
  const { theme } = useTheme();
  const steam = useSteam();
  const { matches, matchAppIds } = useSteamMatches();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);

  return (
    <>
      {steam.connected && (
        <div className="flex justify-end mb-3">
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
