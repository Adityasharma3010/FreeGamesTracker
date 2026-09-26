import React, { useState } from "react";
import { Link } from "react-router-dom";
import SteamAvatar from "./SteamAvatar.jsx";
import SteamGameImage from "./SteamGameImage.jsx";
import { SiSteam } from "react-icons/si";
import { LuGift, LuExternalLink } from "react-icons/lu";

// The actual profile layout — hero, stats, showcases, achievements,
// friends. Shared between "my own connected profile" (SteamProfilePage)
// and "a friend's profile viewed in-app" (FriendProfilePage), which is
// why every internal link goes through `basePath`/`gamePath` props
// instead of a hardcoded /steam/... — the two callers point them at
// different route prefixes.

// Steam's own level-ring colours, roughly by tens.
function levelColor(level) {
  const tiers = [
    "#9b9b9b",
    "#c02942",
    "#d95b43",
    "#fecc23",
    "#467a3c",
    "#4e8ddb",
    "#7652c9",
    "#c252c9",
    "#542437",
    "#997c52",
  ];
  return tiers[Math.min(Math.floor(level / 10), tiers.length - 1)];
}

const hours = (minutes) => {
  const h = minutes / 60;
  return `${h < 10 ? h.toFixed(1) : Math.round(h).toLocaleString()} hrs`;
};

function Showcase({ title, to, children }) {
  return (
    <section
      className="border"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.28)",
      }}
    >
      <header
        className="flex items-baseline justify-between px-3 py-2"
        style={{
          background:
            "linear-gradient(90deg, rgba(42,138,148,0.9), rgba(42,138,148,0.3))",
        }}
      >
        <h2 className="text-[13px] font-bold text-white">{title}</h2>
        {to && (
          <Link
            to={to}
            className="text-[11px] font-bold text-white/80 hover:text-white transition-colors"
          >
            View all →
          </Link>
        )}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

function StatRow({ to, label, value, gold }) {
  const inner = (
    <>
      <span
        className="text-[13px] font-bold"
        style={{ color: gold ? "#fbbf24" : "rgba(255,255,255,0.85)" }}
      >
        {label}
      </span>
      <span
        className="text-xl font-light"
        style={{ color: gold ? "#fbbf24" : "rgba(255,255,255,0.6)" }}
      >
        {value}
      </span>
    </>
  );
  const cls = "flex items-baseline justify-between gap-3 py-1.5";
  return to ? (
    <Link to={to} className={`${cls} transition-opacity hover:opacity-70`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function RecentRow({ appid, name, twoWeeks, total, gamePath }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <Link
      to={gamePath(appid)}
      className="group flex items-center gap-3 p-1.5 transition-colors duration-150 hover:bg-white/5"
    >
      <div className="relative w-28 sm:w-36 shrink-0 aspect-[460/215] overflow-hidden bg-white/5">
        {imgOk ? (
          <SteamGameImage
            appid={appid}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onAllFailed={() => setImgOk(false)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <SiSteam size={18} className="text-white/40" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-white leading-snug line-clamp-1">
          {name}
        </p>
        <p className="text-[11px] text-white/60 mt-0.5">
          {hours(twoWeeks)} past 2 weeks
        </p>
        <p className="text-[11px] text-white/40">{hours(total)} on record</p>
      </div>
    </Link>
  );
}

function MiniGameCard({ appid, name, sub, highlight, gamePath }) {
  const [imgOk, setImgOk] = useState(true);
  const glow = highlight ? "#fbbf24" : "#2fb4ff";
  return (
    <Link
      to={gamePath(appid)}
      className="group flex flex-col overflow-hidden border transition-all duration-200 hover:-translate-y-1"
      style={{
        background: "rgba(255,255,255,0.05)",
        borderColor: highlight ? "#fbbf24" : "rgba(255,255,255,0.1)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = `0 0 14px ${glow}66`)
      }
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div className="relative w-full aspect-[460/215] overflow-hidden bg-white/5">
        {imgOk ? (
          <SteamGameImage
            appid={appid}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onAllFailed={() => setImgOk(false)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <SiSteam size={20} className="text-white/40" />
          </div>
        )}
        {highlight && (
          <span
            className="absolute top-1 right-1 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded"
            style={{ background: "#fbbf24", color: "#151517" }}
          >
            Free
          </span>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="text-[11px] font-bold leading-snug line-clamp-1 text-white">
          {name}
        </p>
        {sub && (
          <p className="text-[10px] font-bold mt-0.5 text-white/40">{sub}</p>
        )}
      </div>
    </Link>
  );
}

export default function SteamProfileView({
  status,
  error,
  theme,
  playerProfile,
  equipped,
  steamid,
  wishlistGames,
  libraryGames,
  matches,
  matchAppIds,
  basePath,
  gamePath,
  // When set, a friend's row in the Friends list links in-app instead of
  // out to Steam (used on the signed-in user's own profile). Friend
  // pages viewing THEIR friends still just link out — going two levels
  // deep in-app isn't worth the complexity this app needs right now.
  friendPath,
}) {
  if (status === "loading" || status === "idle") {
    return (
      <div
        className="flex flex-col gap-4"
        aria-label="Loading Steam profile"
        role="status"
      >
        <div
          className="h-56 motion-safe:animate-pulse"
          style={{ background: theme.chipBg }}
        />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 motion-safe:animate-pulse"
              style={{ background: theme.chipBg }}
            />
          ))}
        </div>
        <div className="grid lg:grid-cols-[1fr_260px] gap-4 items-start">
          <div className="flex flex-col gap-3">
            <div
              className="h-40 motion-safe:animate-pulse"
              style={{ background: theme.chipBg }}
            />
            <div
              className="h-40 motion-safe:animate-pulse"
              style={{ background: theme.chipBg }}
            />
          </div>
          <div
            className="h-48 motion-safe:animate-pulse"
            style={{ background: theme.chipBg }}
          />
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <p className="text-[13px]" style={{ color: theme.textDim }}>
        Couldn't load this Steam profile: {error}
      </p>
    );
  }

  const vis = playerProfile?.visibility;
  const level = equipped?.level;
  const friends = equipped?.friends || [];
  const recent = equipped?.recentGames || [];
  const achievements = equipped?.achievements || [];
  const mostPlayed = [...libraryGames]
    .filter((g) => (g.playtime || 0) > 0)
    .sort((a, b) => b.playtime - a.playtime)
    .slice(0, 6);
  const wishlistPicks = wishlistGames.slice(0, 6);

  return (
    <div className="flex flex-col gap-4">
      <section
        className="relative overflow-hidden border"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.65), rgba(0,0,0,0.3))",
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 p-5">
          <SteamAvatar
            src={playerProfile?.avatar || null}
            video={equipped?.animatedAvatar}
            frame={equipped?.avatarFrame?.image}
            frameVideo={equipped?.avatarFrame}
            size={150}
            className="self-start sm:self-auto"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight truncate text-white drop-shadow">
              {playerProfile?.personaname || "Steam user"}
            </h1>
            <span
              className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded inline-block mt-2"
              style={
                vis === "public"
                  ? { background: "#4bdc3d33", color: "#7dff70" }
                  : { background: "#fbbf2433", color: "#fbbf24" }
              }
            >
              {vis === "public"
                ? "Public profile"
                : vis === "friendsonly"
                  ? "Friends-only profile"
                  : vis === "private"
                    ? "Private profile"
                    : "Visibility unknown"}
            </span>
            {playerProfile?.inGame ? (
              <span
                className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded inline-flex items-center gap-1 mt-2 ml-1.5"
                style={{ background: "#7dff7033", color: "#7dff70" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#7dff70]" />
                In-game: {playerProfile.inGame}
              </span>
            ) : playerProfile?.personaState === "online" ? (
              <span
                className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded inline-flex items-center gap-1 mt-2 ml-1.5"
                style={{ background: "#4bdc3d33", color: "#7dff70" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#7dff70]" />
                Online
              </span>
            ) : null}
            {steamid && steamid !== "MOCK" && (
              <div className="mt-3">
                <a
                  href={`https://steamcommunity.com/profiles/${steamid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap-target inline-flex items-center gap-2 text-[12px] font-black px-4 py-2 rounded-sm uppercase tracking-wide transition-transform duration-150 hover:scale-[1.03] active:scale-95"
                  style={{ background: "#2fb4ff", color: "#051622" }}
                >
                  <SiSteam size={14} /> Open on Steam ↗
                </a>
              </div>
            )}
          </div>
          {typeof level === "number" && (
            <div className="flex items-center gap-2.5 sm:self-start">
              <span className="text-2xl font-light text-white">Level</span>
              <span
                className="w-10 h-10 rounded-full border-[3px] flex items-center justify-center text-base font-bold text-white bg-black/40"
                style={{ borderColor: levelColor(level) }}
              >
                {level}
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_260px] gap-4 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          {matches.length > 0 && (
            <Link
              to={`${basePath}/matches`}
              className="flex items-center gap-3 px-4 py-3 border-2 transition-transform duration-200 hover:scale-[1.01]"
              style={{
                background: "#fbbf241a",
                borderColor: "#fbbf24",
                boxShadow: "0 0 14px #fbbf2444",
              }}
            >
              <LuGift size={18} style={{ color: "#fbbf24" }} />
              <span className="text-[13px] font-bold flex-1 text-white">
                {matches.length} game{matches.length > 1 ? "s" : ""} on{" "}
                {basePath.includes("/friend/") ? "their" : "your"} wishlist{" "}
                {matches.length > 1 ? "are" : "is"} free right now
              </span>
              <span
                className="text-[11px] font-black uppercase"
                style={{ color: "#fbbf24" }}
              >
                Claim →
              </span>
            </Link>
          )}

          {recent.length > 0 && (
            <Showcase title="Recent Activity">
              <div className="flex flex-col gap-1">
                {recent.map((g) => (
                  <RecentRow
                    key={g.appid}
                    appid={g.appid}
                    name={g.name}
                    twoWeeks={g.playtime2w}
                    total={g.playtimeForever}
                    gamePath={gamePath}
                  />
                ))}
              </div>
            </Showcase>
          )}

          {mostPlayed.length > 0 && (
            <Showcase title="Most Played" to={`${basePath}/library`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {mostPlayed.map((g) => (
                  <MiniGameCard
                    key={g.appid}
                    appid={g.appid}
                    name={g.name}
                    sub={`${hours(g.playtime)} on record`}
                    gamePath={gamePath}
                  />
                ))}
              </div>
            </Showcase>
          )}

          {wishlistPicks.length > 0 && (
            <Showcase title="Wishlist Showcase" to={`${basePath}/wishlist`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {wishlistPicks.map((g) => (
                  <MiniGameCard
                    key={g.appid}
                    appid={g.appid}
                    name={g.name}
                    highlight={matchAppIds.has(g.appid)}
                    gamePath={gamePath}
                  />
                ))}
              </div>
            </Showcase>
          )}
        </div>

        <aside className="flex flex-col gap-4 order-first lg:order-none">
          <div
            className="border px-4 py-2"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.28)",
            }}
          >
            <StatRow
              to={`${basePath}/library`}
              label="Games"
              value={libraryGames.length}
            />
            <StatRow
              to={`${basePath}/wishlist`}
              label="Wishlist"
              value={wishlistGames.length}
            />
            <StatRow
              to={`${basePath}/matches`}
              label="Free now"
              value={matches.length}
              gold={matches.length > 0}
            />
          </div>

          {achievements.length > 0 && (
            <div
              className="border px-4 py-3"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.28)",
              }}
            >
              <p className="text-[11px] font-black uppercase tracking-wide text-white/50 mb-2.5">
                Rarest Achievements
              </p>
              <ul className="flex flex-col gap-2.5">
                {achievements.map((a) => (
                  <li
                    key={`${a.appid}-${a.apiname}`}
                    className="flex items-center gap-2.5"
                  >
                    {a.icon ? (
                      <img
                        src={a.icon}
                        alt=""
                        className="w-8 h-8 rounded-sm shrink-0"
                      />
                    ) : (
                      <span className="w-8 h-8 rounded-sm bg-white/10 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] font-bold text-white/85 truncate">
                        {a.name}
                      </span>
                      <span className="block text-[10px] text-white/40 truncate">
                        {a.gameName || `App ${a.appid}`}
                      </span>
                    </span>
                    {typeof a.percent === "number" && (
                      <span
                        className="text-[10px] font-black shrink-0"
                        style={{
                          color:
                            a.percent < 10
                              ? "#fbbf24"
                              : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {a.percent.toFixed(1)}%
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {friends.length > 0 && (
            <div
              className="border px-4 py-3"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.28)",
              }}
            >
              <p className="text-[11px] font-black uppercase tracking-wide text-white/50 mb-2.5">
                Friends
              </p>
              <ul className="flex flex-col gap-2">
                {friends.map((f) => (
                  <li key={f.steamid} className="flex items-center gap-2.5">
                    {friendPath ? (
                      <Link
                        to={friendPath(f.steamid)}
                        className="flex items-center gap-2.5 flex-1 min-w-0"
                      >
                        <span className="relative w-7 h-7 shrink-0">
                          {f.avatar ? (
                            <img
                              src={f.avatar}
                              alt=""
                              className="w-full h-full rounded-sm object-cover"
                            />
                          ) : (
                            <span className="w-full h-full rounded-sm bg-white/10 flex items-center justify-center">
                              <SiSteam size={13} className="text-white/40" />
                            </span>
                          )}
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                            style={{
                              borderColor: "#0a0c11",
                              background: f.online ? "#4bdc3d" : "#6b6b6b",
                            }}
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11.5px] text-white/85 leading-tight truncate">
                            {f.name}
                          </p>
                          {f.inGame && (
                            <p className="text-[10px] text-[#7dff70] leading-tight truncate">
                              In {f.inGame}
                            </p>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="relative w-7 h-7 shrink-0">
                          {f.avatar ? (
                            <img
                              src={f.avatar}
                              alt=""
                              className="w-full h-full rounded-sm object-cover"
                            />
                          ) : (
                            <span className="w-full h-full rounded-sm bg-white/10 flex items-center justify-center">
                              <SiSteam size={13} className="text-white/40" />
                            </span>
                          )}
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                            style={{
                              borderColor: "#0a0c11",
                              background: f.online ? "#4bdc3d" : "#6b6b6b",
                            }}
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11.5px] text-white/85 leading-tight truncate">
                            {f.name}
                          </p>
                          {f.inGame && (
                            <p className="text-[10px] text-[#7dff70] leading-tight truncate">
                              In {f.inGame}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <a
                      href={`https://steamcommunity.com/profiles/${f.steamid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${f.name} on Steam`}
                      className="shrink-0 p-1 rounded transition-colors hover:bg-white/10"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      <LuExternalLink size={13} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
