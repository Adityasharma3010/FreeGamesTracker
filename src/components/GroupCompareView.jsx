import React, { useEffect, useMemo, useState } from "react";
import CompareGameTile from "./CompareGameTile.jsx";
import SteamGameImage from "./SteamGameImage.jsx";
import { compareGroup, GROUP_COLORS } from "../lib/steamGroupCompare.js";
import { computeLibraryStats } from "../lib/steamLibraryStats.js";
import { formatHours } from "../lib/steamCompare.js";

const SHOW_FIRST = 8;
const num = (n) => Math.round(n).toLocaleString("en-US");

function Avatar({ player, size }) {
  return player.avatar ? (
    <img
      src={player.avatar}
      alt=""
      className={`${size} object-cover`}
      style={{
        boxShadow: `0 0 0 3px ${player.color}, 0 0 28px ${player.color}55`,
      }}
    />
  ) : (
    <div
      className={`${size} flex items-center justify-center text-2xl font-black text-white`}
      style={{
        background: "rgba(255,255,255,0.08)",
        boxShadow: `0 0 0 3px ${player.color}, 0 0 28px ${player.color}55`,
      }}
    >
      {(player.name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

// One scoreboard block: a row per player, longest bar = the leader.
function Scoreboard({ title, rows, shown }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  return (
    <div>
      <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50 mb-2">
        {title}
      </h3>
      <div className="flex flex-col gap-1.5">
        {sorted.map((r) => (
          <div key={r.steamid} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-[11.5px] font-bold text-white/85">
              {r.name}
            </span>
            <div className="flex-1 h-2 bg-white/10">
              <div
                className="h-full motion-reduce:transition-none"
                style={{
                  width: shown
                    ? `${Math.max(2, (r.value / max) * 100)}%`
                    : "0%",
                  background: r.color,
                  transition: "width 1000ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-[11.5px] font-black tabular-nums text-white">
              {r.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, hint, accent, count, children, theme }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-stretch gap-2.5">
        <span className="w-[3px] shrink-0" style={{ background: accent }} />
        <div>
          <h2
            className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wide"
            style={{ color: theme.text }}
          >
            {title}
            <span
              className="px-1.5 py-0.5 text-[10px] font-black"
              style={{ background: theme.chipBg, color: theme.textDim }}
            >
              {count}
            </span>
          </h2>
          <p className="text-[11.5px]" style={{ color: theme.textDim }}>
            {hint}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Tiles({ games, variant, theme, onOpenGame, statsFor, noteFor }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? games : games.slice(0, SHOW_FIRST);
  if (games.length === 0) {
    return (
      <p className="text-[12px]" style={{ color: theme.textFaint }}>
        Nothing here.
      </p>
    );
  }
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {shown.map((g, i) => (
          <CompareGameTile
            key={g.appid}
            index={i}
            variant={variant}
            game={g}
            stats={statsFor ? statsFor(g) : []}
            note={noteFor ? noteFor(g) : undefined}
            theme={theme}
            onSelect={onOpenGame}
          />
        ))}
      </div>
      {games.length > SHOW_FIRST && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="tap-target self-start text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border cursor-pointer transition-colors duration-150 hover:bg-white/10"
          style={{ borderColor: theme.surfaceBorder, color: theme.textFaint }}
        >
          {showAll ? "Show fewer" : `Show all ${games.length}`}
        </button>
      )}
    </>
  );
}

// Compare 3 to 6 players at once. `players` =
//   [{ steamid, name, avatar, level, library, wishlist, libraryHidden }]
// in the order they were given (the first is "you" when signed in).
export default function GroupCompareView({
  players: raw,
  theme,
  onOpenGame,
  actions,
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const players = useMemo(
    () =>
      raw.map((p, i) => ({
        ...p,
        color: GROUP_COLORS[i % GROUP_COLORS.length],
      })),
    [raw],
  );
  const group = useMemo(() => compareGroup(players), [players]);
  const byId = useMemo(
    () => new Map(players.map((p) => [p.steamid, p])),
    [players],
  );
  const nameOf = (id) => byId.get(id)?.name || "Player";
  const colorOf = (id) => byId.get(id)?.color;

  const stats = useMemo(
    () =>
      new Map(
        players.map((p) => [
          p.steamid,
          p.libraryHidden ? null : computeLibraryStats(p.library),
        ]),
      ),
    [players],
  );
  const visible = players.filter((p) => !p.libraryHidden);
  const bgAppid = group.everyoneOwns[0]?.appid;
  const [bgFailed, setBgFailed] = useState(false);

  const hoursRows = visible.map((p) => ({
    steamid: p.steamid,
    name: p.name,
    color: p.color,
    value: stats.get(p.steamid).totalHours,
    text: `${num(stats.get(p.steamid).totalHours)}h`,
  }));
  const gamesRows = visible.map((p) => ({
    steamid: p.steamid,
    name: p.name,
    color: p.color,
    value: stats.get(p.steamid).total,
    text: num(stats.get(p.steamid).total),
  }));

  const playsStats = (g) =>
    g.plays.map((x) => ({
      name: nameOf(x.steamid),
      minutes: x.minutes,
      color: colorOf(x.steamid),
    }));
  const wantStats = (g) =>
    g.wantedBy.map((id) => ({
      name: nameOf(id),
      minutes: 0,
      label: (nameOf(id)[0] || "?").toUpperCase(), // initial; full name on hover
      color: colorOf(id),
    }));

  const hiddenNames = group.hiddenLibraries.map(nameOf);
  const emptyWishNames = group.emptyWishlists.map(nameOf);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">
        Group comparison: {players.map((p) => p.name).join(", ")}
      </h1>
      {actions && (
        <div className="flex items-center justify-end gap-2">{actions}</div>
      )}

      {/* ---- poster ---- */}
      <div
        className="relative overflow-hidden border"
        style={{ borderColor: "rgba(255,255,255,0.12)", background: "#0a0d15" }}
      >
        {bgAppid && !bgFailed && (
          <SteamGameImage
            appid={bgAppid}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: 0.28,
              filter: "blur(20px) saturate(1.4)",
              transform: "scale(1.2)",
            }}
            onAllFailed={() => setBgFailed(true)}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: [
              `radial-gradient(ellipse 55% 100% at 0% 0%, ${players[0].color}4d, transparent 65%)`,
              `radial-gradient(ellipse 55% 100% at 100% 0%, ${players[1].color}4d, transparent 65%)`,
              "linear-gradient(180deg, rgba(10,13,21,0.25), rgba(10,13,21,0.82))",
            ].join(","),
          }}
        />
        <div className="relative z-10 flex flex-col gap-6 px-3 sm:px-8 pt-7 pb-6">
          <div className="flex flex-wrap justify-center gap-x-6 sm:gap-x-9 gap-y-5">
            {players.map((p) => (
              <div
                key={p.steamid}
                className="flex flex-col items-center gap-1.5 w-[92px] sm:w-[112px]"
              >
                <div className="relative">
                  <Avatar player={p} size="w-14 h-14 sm:w-20 sm:h-20" />
                  {typeof p.level === "number" && (
                    <span
                      className="absolute -bottom-2 -right-2 min-w-[24px] h-[24px] px-1 flex items-center justify-center text-[10.5px] font-black rounded-full border-2 text-white"
                      style={{ background: "#0b0e16", borderColor: p.color }}
                      title={`Steam level ${p.level}`}
                    >
                      {p.level}
                    </span>
                  )}
                </div>
                <span className="max-w-full truncate text-[12.5px] sm:text-[14px] font-black text-white mt-1.5">
                  {p.name}
                </span>
                <span className="h-[3px] w-8" style={{ background: p.color }} />
                <span className="text-[10.5px] text-white/60">
                  {p.libraryHidden
                    ? "Library private"
                    : `${num(stats.get(p.steamid).total)} games`}
                </span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="text-[34px] sm:text-[44px] font-black leading-none text-white">
              {group.everyoneOwns.length}
            </div>
            <div
              className="mt-1 text-[11px] font-black uppercase tracking-[0.18em]"
              style={{ color: "#e879f9" }}
            >
              game{group.everyoneOwns.length === 1 ? "" : "s"} you all own
            </div>
          </div>

          {visible.length >= 2 && (
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5 w-full max-w-[760px] mx-auto">
              <Scoreboard title="Hours played" rows={hoursRows} shown={shown} />
              <Scoreboard title="Games owned" rows={gamesRows} shown={shown} />
            </div>
          )}
        </div>
      </div>

      {(hiddenNames.length > 0 || emptyWishNames.length > 0) && (
        <p className="text-[11.5px]" style={{ color: theme.textDim }}>
          {hiddenNames.length > 0 &&
            `${hiddenNames.join(", ")}: game library isn't visible, so they're left out of the ownership lists. `}
          {emptyWishNames.length > 0 &&
            `${emptyWishNames.join(", ")}: wishlist is empty or private, so it isn't counted for wishlists.`}
        </p>
      )}

      {/* ---- sections ---- */}
      {visible.length >= 2 && (
        <Section
          title="You all own"
          hint="Everyone has these — most hours played together first."
          accent="linear-gradient(180deg, #2fb4ff, #e879f9)"
          count={group.everyoneOwns.length}
          theme={theme}
        >
          <Tiles
            games={group.everyoneOwns}
            variant="split"
            theme={theme}
            onOpenGame={onOpenGame}
            statsFor={playsStats}
          />
        </Section>
      )}

      {visible.length >= 3 && (
        <Section
          title="Owned by all but one"
          hint="One person short of a full squad — worth a gift or a sale."
          accent="#fbbf24"
          count={group.allButOne.length}
          theme={theme}
        >
          <Tiles
            games={group.allButOne}
            variant="split"
            theme={theme}
            onOpenGame={onOpenGame}
            statsFor={playsStats}
            noteFor={(g) => `Missing: ${nameOf(g.missing)}`}
          />
        </Section>
      )}

      {group.everyoneWants.length > 0 ||
      group.emptyWishlists.length < players.length - 1 ? (
        <Section
          title="You all want"
          hint="On everyone's wishlist."
          accent="#7dff70"
          count={group.everyoneWants.length}
          theme={theme}
        >
          <Tiles
            games={group.everyoneWants}
            variant="overlay"
            theme={theme}
            onOpenGame={onOpenGame}
          />
        </Section>
      ) : null}

      {group.wishedByMany.length > 0 && (
        <Section
          title="Wanted by several of you"
          hint="On two or more wishlists — the coloured letters show who wants it."
          accent="#e879f9"
          count={group.wishedByMany.length}
          theme={theme}
        >
          <Tiles
            games={group.wishedByMany}
            variant="overlay"
            theme={theme}
            onOpenGame={onOpenGame}
            statsFor={wantStats}
          />
        </Section>
      )}
    </div>
  );
}
