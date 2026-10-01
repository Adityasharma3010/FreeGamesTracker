import React, { useMemo, useState } from "react";
import { LuTrophy } from "react-icons/lu";
import AchievementCompareModal from "./AchievementCompareModal.jsx";
import { GameTile } from "./SteamConnect.jsx";
import { compareLibraries, formatHours } from "../lib/steamCompare.js";

const SHOW_FIRST = 8;

function Section({
  title,
  hint,
  games,
  badgeFor,
  onSelect,
  theme,
  overlayFor,
}) {
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
              <div key={g.appid} className="relative">
                <GameTile
                  appid={g.appid}
                  name={g.name}
                  theme={theme}
                  highlight={false}
                  badge={badgeFor ? badgeFor(g) : null}
                  index={i}
                  onSelect={onSelect}
                />
                {overlayFor && overlayFor(g)}
              </div>
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

// The compare body, shared by two pages:
//   - FriendComparePage  (selfMode: "you" vs a friend, signed in)
//   - PublicComparePage  (a shared link: two named players, no sign-in)
// `me` / `them` are { steamid, name, library, wishlist, libraryHidden }.
// In selfMode the wording is the original "you / they" text; otherwise
// both players are referred to by name.
export default function CompareView({
  me,
  them,
  selfMode,
  theme,
  onOpenGame,
  actions,
}) {
  const [comparingAchv, setComparingAchv] = useState(null); // { appid, name }

  const result = useMemo(
    () =>
      compareLibraries({
        myLibrary: me.library,
        myWishlist: me.wishlist,
        theirLibrary: them.library,
        theirWishlist: them.wishlist,
      }),
    [me.library, me.wishlist, them.library, them.wishlist],
  );

  const a = selfMode ? "You" : me.name;
  const b = them.name;
  const bothLibraries = !me.libraryHidden && !them.libraryHidden;
  const hiddenNames = [me.libraryHidden && a, them.libraryHidden && b].filter(
    Boolean,
  );
  const n = result.both.length;
  const plural = n === 1 ? "" : "s";

  let subtitle;
  if (bothLibraries) {
    subtitle = selfMode
      ? `You both own ${n} game${plural}.`
      : `${n} game${plural} in common.`;
  } else if (selfMode && them.libraryHidden && !me.libraryHidden) {
    subtitle = `${b}'s game library isn't visible, so only wishlists can be compared.`;
  } else {
    subtitle = `${hiddenNames.join(" and ")}: game library isn't visible, so only some comparisons can be shown.`;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[16px] font-black" style={{ color: theme.text }}>
            {a} and {b}
          </h1>
          <p className="text-[12px]" style={{ color: theme.textDim }}>
            {subtitle}
          </p>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {bothLibraries && (
        <Section
          title={selfMode ? "You both own" : "Both own"}
          hint="Most hours put in together first. The trophy icon compares achievements for that game."
          games={result.both}
          badgeFor={(g) => ({
            label: `${a} ${formatHours(g.myPlaytime)} · ${b} ${formatHours(g.theirPlaytime)}`,
            color: "#2fb4ff",
          })}
          onSelect={onOpenGame}
          theme={theme}
          overlayFor={(g) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setComparingAchv({ appid: g.appid, name: g.name });
              }}
              aria-label={`Compare achievements for ${g.name}`}
              className="tap-target absolute bottom-1 right-1 z-10 flex items-center justify-center w-6 h-6 rounded cursor-pointer transition-colors duration-150"
              style={{ background: "rgba(0,0,0,0.65)", color: "#e879f9" }}
            >
              <LuTrophy size={12} />
            </button>
          )}
        />
      )}
      {!them.libraryHidden && (
        <Section
          title={
            selfMode
              ? "On your wishlist — they own it"
              : `On ${a}'s wishlist — ${b} owns it`
          }
          hint={`Games ${selfMode ? "you want" : `${a} wants`} that ${b} already has.`}
          games={result.theyOwnYourWishlist}
          badgeFor={(g) => ({
            label: `${b} ${formatHours(g.theirPlaytime)}`,
            color: "#e879f9",
          })}
          onSelect={onOpenGame}
          theme={theme}
        />
      )}
      {!me.libraryHidden && (
        <Section
          title={
            selfMode
              ? "On their wishlist — you own it"
              : `On ${b}'s wishlist — ${a} owns it`
          }
          hint={`Games ${b} wants that ${selfMode ? "you" : a} already ${selfMode ? "have" : "has"}.`}
          games={result.youOwnTheirWishlist}
          badgeFor={(g) => ({
            label: `${a} ${formatHours(g.myPlaytime)}`,
            color: "#7dff70",
          })}
          onSelect={onOpenGame}
          theme={theme}
        />
      )}
      <Section
        title="On both wishlists"
        hint={selfMode ? "Games you both want." : "Games both want."}
        games={result.bothWant}
        onSelect={onOpenGame}
        theme={theme}
      />

      {comparingAchv && (
        <AchievementCompareModal
          game={comparingAchv}
          mySteamid={me.steamid}
          myName={a}
          theirSteamid={them.steamid}
          theirName={b}
          theme={theme}
          onClose={() => setComparingAchv(null)}
        />
      )}
    </div>
  );
}
