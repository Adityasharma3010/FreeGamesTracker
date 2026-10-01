import React, { useEffect, useState } from "react";
import { LuCheck, LuX, LuMinus } from "react-icons/lu";
import { mergeAchievementCompare } from "../lib/steamCompare.js";

async function fetchOne(steamid, appid) {
  const r = await fetch(
    `/api/steam-achievements?steamid=${steamid}&appid=${appid}`,
  );
  return r.json();
}

// One check/cross/dash column per player, per achievement, for a single
// game chosen from the "You both own" list on the Compare tab. Fetched
// on demand — two calls (one per player), only for the one game picked —
// rather than for every shared game automatically.
export default function AchievementCompareModal({
  game, // { appid, name }
  mySteamid,
  myName,
  theirSteamid,
  theirName,
  theme,
  onClose,
}) {
  const me = myName || "You";
  const [state, setState] = useState({ status: "loading", merged: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", merged: null });
    Promise.all([
      fetchOne(mySteamid, game.appid),
      fetchOne(theirSteamid, game.appid),
    ])
      .then(([mine, theirs]) => {
        if (cancelled) return;
        setState({
          status: "success",
          merged: mergeAchievementCompare(mine, theirs),
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", merged: null });
      });
    return () => {
      cancelled = true;
    };
  }, [game.appid, mySteamid, theirSteamid]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const m = state.merged;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Compare achievements for ${game.name}`}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md max-h-[85vh] flex flex-col border-2 overflow-hidden"
        style={{ background: theme.panelBg, borderColor: "#e879f9" }}
      >
        <div
          className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
          style={{ borderColor: theme.surfaceBorder }}
        >
          <div className="min-w-0">
            <h2
              className="text-[12px] font-black uppercase tracking-wide truncate"
              style={{ color: theme.text }}
            >
              {game.name}
            </h2>
            <p
              className="text-[10.5px] font-bold"
              style={{ color: theme.textFaint }}
            >
              Achievements — {me === "You" ? "you" : me} vs. {theirName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-target shrink-0 cursor-pointer"
            style={{ color: theme.textFaint }}
          >
            <LuX size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {state.status === "loading" && (
            <p className="p-4 text-[12px]" style={{ color: theme.textFaint }}>
              Loading achievements…
            </p>
          )}
          {state.status === "error" && (
            <p className="p-4 text-[12px]" style={{ color: theme.textDim }}>
              Couldn't load achievements for this game.
            </p>
          )}

          {m?.noAchievements && (
            <p className="p-4 text-[12px]" style={{ color: theme.textDim }}>
              This game has no achievements.
            </p>
          )}

          {m && !m.noAchievements && (
            <>
              <div
                className="grid grid-cols-3 items-center gap-2 px-3 py-2 border-b sticky top-0 text-[10.5px] font-black uppercase tracking-wide"
                style={{
                  borderColor: theme.surfaceBorder,
                  background: theme.panelBg,
                  color: theme.textFaint,
                }}
              >
                <span>
                  {m.summary.myLocked
                    ? `${me} (private)`
                    : `${me} · ${m.summary.myUnlocked}/${m.summary.myTotal}`}
                </span>
                <span className="text-center">&nbsp;</span>
                <span className="text-right truncate">
                  {m.summary.theirLocked
                    ? `${theirName} (private)`
                    : `${theirName} · ${m.summary.theirUnlocked}/${m.summary.theirTotal}`}
                </span>
              </div>

              {m.rows.length === 0 ? (
                <p
                  className="p-4 text-[12px] leading-relaxed"
                  style={{ color: theme.textDim }}
                >
                  Neither of you has achievement progress visible for this game,
                  so there's nothing to show side by side.
                </p>
              ) : (
                m.rows.map((a) => (
                  <div
                    key={a.apiname}
                    className="flex items-center gap-2.5 px-3 py-2 border-b"
                    style={{ borderColor: theme.surfaceBorder }}
                  >
                    <Mark achieved={a.mine} unknown={a.mineUnknown} />
                    {(a.mine ? a.icon : a.iconGray || a.icon) ? (
                      <img
                        src={a.mine ? a.icon : a.iconGray || a.icon}
                        alt=""
                        loading="lazy"
                        className="w-7 h-7 shrink-0 rounded"
                        style={{ opacity: a.mine || a.theirs ? 1 : 0.5 }}
                      />
                    ) : (
                      <div
                        className="w-7 h-7 shrink-0 rounded"
                        style={{ background: theme.chipBg }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[11px] font-bold leading-snug truncate"
                        style={{ color: theme.text }}
                      >
                        {a.hidden && !a.mine && !a.theirs
                          ? "Hidden achievement"
                          : a.name}
                      </p>
                      {Number.isFinite(Number(a.globalPercent)) && (
                        <p
                          className="text-[9.5px] font-bold"
                          style={{ color: theme.textFaint }}
                        >
                          {Number(a.globalPercent).toFixed(1)}% of players
                        </p>
                      )}
                    </div>
                    <Mark achieved={a.theirs} unknown={a.theirsUnknown} />
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Mark({ achieved, unknown }) {
  if (unknown) {
    return (
      <LuMinus
        size={16}
        className="shrink-0"
        style={{ color: "#666" }}
        aria-label="Unknown (private)"
      />
    );
  }
  return achieved ? (
    <LuCheck
      size={16}
      className="shrink-0"
      style={{ color: "#7dff70" }}
      aria-label="Unlocked"
    />
  ) : (
    <LuX
      size={16}
      className="shrink-0"
      style={{ color: "#555" }}
      aria-label="Locked"
    />
  );
}
