import React, { useMemo, useState } from "react";
import AchievementCompareModal from "./AchievementCompareModal.jsx";
import CompareHero from "./CompareHero.jsx";
import CompareSpotlight from "./CompareSpotlight.jsx";
import CompareCardModal from "./CompareCardModal.jsx";
import { LuShare2 } from "react-icons/lu";
import { computeHighlights } from "../lib/steamCompareInsights.js";
import CompareGameTile from "./CompareGameTile.jsx";
import { compareLibraries, formatHours } from "../lib/steamCompare.js";

const SHOW_FIRST = 8;
const BLUE = "#2fb4ff";
const PINK = "#e879f9";

function Section({
  title,
  hint,
  accent,
  games,
  statsFor,
  legend,
  variant,
  onSelect,
  onAchievements,
  theme,
}) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? games : games.slice(0, SHOW_FIRST);
  const gridClass = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3";
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-stretch gap-2.5">
        <span
          className="w-[3px] shrink-0"
          style={{ background: accent || "#2fb4ff" }}
        />
        <div className="flex-1 min-w-0">
          <h2
            className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wide"
            style={{ color: theme.text }}
          >
            {title}
            <span
              className="px-1.5 py-0.5 text-[10px] font-black"
              style={{ background: theme.chipBg, color: theme.textDim }}
            >
              {games.length}
            </span>
          </h2>
          <p className="text-[11.5px]" style={{ color: theme.textDim }}>
            {hint}
          </p>
        </div>
        {legend && (
          <div className="hidden sm:flex items-center gap-3 self-center text-[10.5px] font-black">
            {legend.map((l) => (
              <span
                key={l.name}
                className="flex items-center gap-1.5"
                style={{ color: theme.textDim }}
              >
                <span className="w-2 h-2" style={{ background: l.color }} />
                {l.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {games.length === 0 ? (
        <p className="text-[12px]" style={{ color: theme.textFaint }}>
          Nothing here.
        </p>
      ) : (
        <>
          <div className={gridClass}>
            {shown.map((g, i) => (
              <CompareGameTile
                key={g.appid}
                index={i}
                variant={variant}
                game={g}
                stats={statsFor ? statsFor(g) : []}
                theme={theme}
                onSelect={onSelect}
                onAchievements={onAchievements}
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
  const [cardOpen, setCardOpen] = useState(false);

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
  const spotlight = useMemo(
    () => (bothLibraries ? computeHighlights(result.both)?.mostTogether : null),
    [bothLibraries, result.both],
  );
  const hiddenNames = [me.libraryHidden && a, them.libraryHidden && b].filter(
    Boolean,
  );

  let subtitle;
  if (selfMode && them.libraryHidden && !me.libraryHidden) {
    subtitle = `${b}'s game library isn't visible, so only wishlists can be compared.`;
  } else {
    subtitle = `${hiddenNames.join(" and ")}: game library isn't visible, so only some comparisons can be shown.`;
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">
        {a} and {b}
      </h1>
      {(actions || bothLibraries) && (
        <div className="flex items-center justify-end gap-2">
          {bothLibraries && (
            <button
              type="button"
              onClick={() => setCardOpen(true)}
              className="tap-target shrink-0 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 cursor-pointer transition-[filter] duration-150 hover:brightness-110"
              style={{ background: "#e879f9", color: "#1a0620" }}
            >
              <LuShare2 size={12} /> Share card
            </button>
          )}
          {actions}
        </div>
      )}
      <CompareHero
        me={me}
        them={them}
        both={result.both}
        theme={theme}
        selfMode={selfMode}
        bgAppid={spotlight?.appid}
      />
      {!bothLibraries && (
        <p className="text-[12px]" style={{ color: theme.textDim }}>
          {subtitle}
        </p>
      )}

      {spotlight && (
        <CompareSpotlight
          game={spotlight}
          aName={a}
          bName={b}
          onOpen={() =>
            onOpenGame({ appid: spotlight.appid, name: spotlight.name })
          }
          onCompareAchievements={() =>
            setComparingAchv({ appid: spotlight.appid, name: spotlight.name })
          }
        />
      )}

      {bothLibraries && (
        <Section
          title={selfMode ? "You both own" : "Both own"}
          hint="Most hours put in together first. The trophy icon compares achievements for that game."
          accent="linear-gradient(180deg, #2fb4ff, #e879f9)"
          games={result.both}
          variant="split"
          legend={[
            { name: a, color: BLUE },
            { name: b, color: PINK },
          ]}
          statsFor={(g) => [
            { name: a, minutes: g.myPlaytime, color: BLUE },
            { name: b, minutes: g.theirPlaytime, color: PINK },
          ]}
          onSelect={onOpenGame}
          onAchievements={(g) =>
            setComparingAchv({ appid: g.appid, name: g.name })
          }
          theme={theme}
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
          accent={PINK}
          variant="overlay"
          statsFor={(g) => [{ name: b, minutes: g.theirPlaytime, color: PINK }]}
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
          accent={BLUE}
          variant="overlay"
          statsFor={(g) => [{ name: a, minutes: g.myPlaytime, color: BLUE }]}
          onSelect={onOpenGame}
          theme={theme}
        />
      )}
      <Section
        title="On both wishlists"
        hint={selfMode ? "Games you both want." : "Games both want."}
        games={result.bothWant}
        accent="linear-gradient(180deg, #2fb4ff, #e879f9)"
        variant="overlay"
        onSelect={onOpenGame}
        theme={theme}
      />

      {cardOpen && (
        <CompareCardModal
          me={me}
          them={them}
          both={result.both}
          spotlight={spotlight}
          theme={theme}
          onClose={() => setCardOpen(false)}
        />
      )}

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
