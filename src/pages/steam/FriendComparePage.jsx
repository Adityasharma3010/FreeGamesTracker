import React, { useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useSteam } from "../../context/SteamContext.jsx";
import { GameTile, TileSkeleton } from "../../components/SteamConnect.jsx";
import { compareLibraries, formatHours } from "../../lib/steamCompare.js";

const SHOW_FIRST = 8;

function Section({ title, hint, games, badgeFor, onSelect, theme }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? games : games.slice(0, SHOW_FIRST);
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2
          className="text-[12px] font-black uppercase tracking-wide"
          style={{ color: theme.text }}
        >
          {title}{" "}
          <span style={{ color: theme.textFaint }}>({games.length})</span>
        </h2>
        <p className="text-[11.5px]" style={{ color: theme.textDim }}>
          {hint}
        </p>
      </div>

      {games.length === 0 ? (
        <p className="text-[12px]" style={{ color: theme.textFaint }}>
          Nothing here.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {shown.map((g, i) => (
              <GameTile
                key={g.appid}
                appid={g.appid}
                name={g.name}
                theme={theme}
                highlight={false}
                badge={badgeFor ? badgeFor(g) : null}
                index={i}
                onSelect={onSelect}
              />
            ))}
          </div>
          {games.length > SHOW_FIRST && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="tap-target self-start text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border cursor-pointer transition-colors duration-150 hover:bg-white/10"
              style={{
                borderColor: theme.surfaceBorder,
                color: theme.textFaint,
              }}
            >
              {showAll ? "Show fewer" : `Show all ${games.length}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

// Your library/wishlist vs the friend's, using data both pages already
// loaded — no extra requests. Only reachable when you're signed in (the
// tab is hidden otherwise, see FriendLayout).
export default function FriendComparePage() {
  const { steamid } = useParams();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const own = useSteam();
  const { steam } = useOutletContext();

  const result = useMemo(
    () =>
      compareLibraries({
        myLibrary: own.libraryGames,
        myWishlist: own.wishlistGames,
        theirLibrary: steam.libraryGames,
        theirWishlist: steam.wishlistGames,
      }),
    [
      own.libraryGames,
      own.wishlistGames,
      steam.libraryGames,
      steam.wishlistGames,
    ],
  );

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
  const go = ({ appid }) => navigate(`/steam/friend/${steamid}/game/${appid}`);
  const libraryHidden =
    steam.libraryPublic === false || steam.libraryGames.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[16px] font-black" style={{ color: theme.text }}>
          You and {name}
        </h1>
        <p className="text-[12px]" style={{ color: theme.textDim }}>
          {libraryHidden
            ? `${name}'s game library isn't visible, so only wishlists can be compared.`
            : `You both own ${result.both.length} game${result.both.length === 1 ? "" : "s"}.`}
        </p>
      </div>

      {!libraryHidden && (
        <Section
          title="You both own"
          hint="Most hours put in together first."
          games={result.both}
          badgeFor={(g) => ({
            label: `You ${formatHours(g.myPlaytime)} · Them ${formatHours(g.theirPlaytime)}`,
            color: "#2fb4ff",
          })}
          onSelect={go}
          theme={theme}
        />
      )}
      {!libraryHidden && (
        <Section
          title="On your wishlist — they own it"
          hint={`Games you want that ${name} already has.`}
          games={result.theyOwnYourWishlist}
          badgeFor={(g) => ({
            label: `Them ${formatHours(g.theirPlaytime)}`,
            color: "#e879f9",
          })}
          onSelect={go}
          theme={theme}
        />
      )}
      <Section
        title="On their wishlist — you own it"
        hint={`Games ${name} wants that you already have.`}
        games={result.youOwnTheirWishlist}
        badgeFor={(g) => ({
          label: `You ${formatHours(g.myPlaytime)}`,
          color: "#7dff70",
        })}
        onSelect={go}
        theme={theme}
      />
      <Section
        title="On both wishlists"
        hint="Games you both want."
        games={result.bothWant}
        onSelect={go}
        theme={theme}
      />
    </div>
  );
}
