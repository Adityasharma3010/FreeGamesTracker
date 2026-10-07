import React, { useEffect, useMemo, useState } from "react";
import { LuSearch, LuX } from "react-icons/lu";
import { normalize } from "../lib/steamListControls.js";
import { getRecentFriends } from "../lib/steamRecentFriends.js";

// Session-level cache, same shape/TTL as the server's own — a second
// open within 10 minutes doesn't even round-trip.
const cache = new Map(); // steamid -> { fetchedAt, result }
const TTL_MS = 10 * 60 * 1000;

function useFriends(steamid) {
  const [state, setState] = useState({
    status: "loading",
    public: true,
    friends: [],
  });

  useEffect(() => {
    if (!steamid) return;
    const cached = cache.get(steamid);
    if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
      setState({ status: "success", ...cached.result });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));
    fetch(`/api/steam-friends?steamid=${steamid}`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        cache.set(steamid, { fetchedAt: Date.now(), result: body });
        setState({ status: "success", ...body });
      })
      .catch(() => {
        if (!cancelled)
          setState({ status: "error", public: true, friends: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [steamid]);

  return state;
}

function FriendRow({ friend: f, theme, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(f.steamid)}
      className="tap-target w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors duration-150 hover:bg-white/10"
    >
      <div
        className="relative w-8 h-8 shrink-0 rounded overflow-hidden"
        style={{ background: theme.chipBg }}
      >
        {f.avatar && (
          <img src={f.avatar} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <span
        className="text-[12.5px] font-bold truncate"
        style={{ color: theme.text }}
      >
        {f.name}
      </span>
      {f.online && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: "#7dff70" }}
          aria-label="Online"
        />
      )}
    </button>
  );
}

// `steamid` is the signed-in viewer's own — whose friends list this
// shows. `onSelect(steamid)` fires with the chosen friend's id;
// navigating from there is the caller's job (different callers want
// different destinations — starting a Compare vs. just viewing them).
// `excludeSteamid` (optional) hides one friend from the Recent list —
// e.g. the one whose Compare page you're already on.
export default function FriendPicker({
  steamid,
  excludeSteamid,
  theme,
  onSelect,
  onClose,
}) {
  const [search, setSearch] = useState("");
  const state = useFriends(steamid);

  // Friends you compared with before — shown above the full list while
  // the search box is empty.
  const recent = useMemo(
    () => getRecentFriends(steamid).filter((f) => f.steamid !== excludeSteamid),
    [steamid, excludeSteamid],
  );
  const showRecent = recent.length > 0 && !search.trim();

  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return state.friends;
    return state.friends.filter((f) => normalize(f.name).includes(q));
  }, [state.friends, search]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a friend"
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm max-h-[80vh] flex flex-col border-2 overflow-hidden"
        style={{ background: theme.panelBg, borderColor: theme.panelBorder }}
      >
        <div
          className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
          style={{ borderColor: theme.surfaceBorder }}
        >
          <h2
            className="text-[12px] font-black uppercase tracking-wide"
            style={{ color: theme.text }}
          >
            Compare with a friend
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-target cursor-pointer"
            style={{ color: theme.textFaint }}
          >
            <LuX size={16} />
          </button>
        </div>

        <div
          className="p-2.5 border-b shrink-0"
          style={{ borderColor: theme.surfaceBorder }}
        >
          <div
            className="flex items-center gap-2 px-2.5 py-2 border"
            style={{ borderColor: theme.chipBorder, background: theme.chipBg }}
          >
            <LuSearch
              size={13}
              style={{ color: theme.textFaint }}
              className="shrink-0"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search friends…"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent outline-none text-[12.5px] font-medium"
              style={{ color: theme.text }}
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {showRecent && (
            <>
              <p
                className="px-3 pt-2.5 pb-1 text-[10px] font-black uppercase tracking-wide"
                style={{ color: theme.textFaint }}
              >
                Recent
              </p>
              {recent.map((f) => (
                <FriendRow
                  key={`recent-${f.steamid}`}
                  friend={f}
                  theme={theme}
                  onSelect={onSelect}
                />
              ))}
              <p
                className="px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-wide border-t mt-1.5"
                style={{
                  color: theme.textFaint,
                  borderColor: theme.surfaceBorder,
                }}
              >
                All friends
              </p>
            </>
          )}
          {state.status === "loading" && (
            <p className="p-4 text-[12px]" style={{ color: theme.textFaint }}>
              Loading friends…
            </p>
          )}
          {state.status !== "loading" && !state.public && (
            <p
              className="p-4 text-[12px] leading-relaxed"
              style={{ color: theme.textDim }}
            >
              Your friends list isn't public, so it can't be loaded here. You
              can still compare with someone by opening their profile directly.
            </p>
          )}
          {state.status === "error" && state.public && (
            <p className="p-4 text-[12px]" style={{ color: theme.textDim }}>
              Couldn't load your friends list.
            </p>
          )}
          {state.status === "success" &&
            state.public &&
            filtered.length === 0 && (
              <p className="p-4 text-[12px]" style={{ color: theme.textDim }}>
                {state.friends.length === 0
                  ? "No friends found on this account."
                  : "No friends match that."}
              </p>
            )}
          {filtered.map((f) => (
            <FriendRow
              key={f.steamid}
              friend={f}
              theme={theme}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
