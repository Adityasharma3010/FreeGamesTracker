import React from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";
import { GameTile, TileSkeleton } from "../../components/SteamConnect.jsx";

// Same grid as SteamGamesPage, fed by the friend's data via Outlet
// context instead of useSteam(). No CSV export or "owned"/"playing"
// badges here — those compare against YOUR OWN library/in-game state,
// which isn't the point of browsing someone else's list.
export default function FriendGamesPage({ kind }) {
  const { steamid } = useParams();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { steam, matchAppIds } = useOutletContext();
  const isWishlist = kind === "wishlist";
  const games = isWishlist ? steam.wishlistGames : steam.libraryGames;

  if (steam.status === "loading" || steam.status === "idle") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <TileSkeleton key={i} index={i} />
        ))}
      </div>
    );
  }
  if (steam.status === "error") {
    return (
      <p className="text-[13px]" style={{ color: theme.textDim }}>
        Couldn't load this data: {steam.error}
      </p>
    );
  }

  if (games.length === 0) {
    let msg = isWishlist ? "Their wishlist is empty." : "No games found.";
    if (steam.playerProfile && steam.playerProfile.visibility !== "public") {
      msg = `This profile is set to ${steam.playerProfile.visibility === "private" ? "private" : "friends-only"} — wishlist and library can't be read until it's public.`;
    } else if (steam.libraryPublic === false) {
      msg =
        'This profile is public, but "Game details" is private/friends-only in their Steam privacy settings — that\'s the specific toggle wishlist and library both need.';
    }
    return (
      <p className="text-[13px]" style={{ color: theme.textDim }}>
        {msg}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {games.map((g, i) => (
        <GameTile
          key={g.appid}
          {...g}
          theme={theme}
          highlight={isWishlist && matchAppIds.has(g.appid)}
          index={i}
          onSelect={({ appid }) =>
            navigate(`/steam/friend/${steamid}/game/${appid}`)
          }
        />
      ))}
    </div>
  );
}
