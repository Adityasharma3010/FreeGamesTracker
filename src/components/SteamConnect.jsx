import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSteam } from "../context/SteamContext.jsx";
import { useGiveaways } from "../hooks/useGiveaways.js";
import { extractSteamAppId } from "../lib/steamMatch.js";
import { SiSteam } from "react-icons/si";
import { LuX } from "react-icons/lu";

function GameRow({ appid, name, icon, theme, highlight }) {
  return (
    <a
      href={`https://store.steampowered.com/app/${appid}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        background: highlight ? "#fbbf241a" : theme.surface,
        borderColor: highlight ? "#fbbf24" : theme.surfaceBorder,
      }}
      className="tap-target flex items-center gap-2.5 px-3 py-2 border transition-transform duration-150 hover:scale-[1.02]"
    >
      {icon ? (
        <img src={icon} alt="" className="w-8 h-8 rounded-sm object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-8 h-8 rounded-sm shrink-0 flex items-center justify-center" style={{ background: theme.chipBg }}>
          <SiSteam size={14} style={{ color: theme.textFaint }} />
        </div>
      )}
      <span className="text-[12.5px] font-bold leading-snug line-clamp-1 flex-1" style={{ color: theme.text }}>
        {name}
      </span>
    </a>
  );
}

export default function SteamConnect() {
  const { theme } = useTheme();
  const { connected, connect, disconnect, status, error, isWishlisted, wishlistGames, libraryGames, libraryPublic, steamid } = useSteam();
  const { giveaways } = useGiveaways();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("matches"); // matches | wishlist | library
  const [input, setInput] = useState("");
  const [showManual, setShowManual] = useState(false);

  const matches =
    connected && status === "success"
      ? giveaways.filter((g) => isWishlisted(extractSteamAppId(g.open_giveaway_url || g.gamerpower_url)))
      : [];

  const handleConnect = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    connect(input);
    setInput("");
  };

  const TABS = [
    { key: "matches", label: `Matches (${matches.length})` },
    { key: "wishlist", label: `Wishlist (${wishlistGames.length})` },
    { key: "library", label: `Library (${libraryGames.length})` },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="tap-target relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
        style={
          connected
            ? { borderColor: "#2fb4ff", color: "#2fb4ff", background: "#2fb4ff1a", boxShadow: "0 0 12px #2fb4ff55" }
            : { borderColor: theme.chipBorder, color: theme.chipText, background: theme.chipBg }
        }
      >
        <SiSteam size={13} />
        <span className="hidden sm:inline">{connected ? "Steam connected" : "Connect Steam"}</span>
        {matches.length > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{ background: "#fbbf24", color: "#151517" }}
          >
            {matches.length}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          // Portaled to document.body — Nav's backdrop-blur makes it the
          // containing block for `position: fixed` descendants otherwise,
          // which mispositions this modal. Same root cause/fix as the
          // sort-dropdown bug from earlier.
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[85vh] flex flex-col border-2 backdrop-blur-xl"
              style={{
                background: theme.panelBg,
                borderColor: theme.panelBorder,
                clipPath: "polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)",
              }}
            >
              <div className="flex items-center justify-between p-5 pb-3 shrink-0">
                <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: theme.text }}>
                  <SiSteam size={16} />
                  Connect Steam
                </h2>
                <button onClick={() => setOpen(false)} style={{ color: theme.textFaint }} aria-label="Close">
                  <LuX size={18} />
                </button>
              </div>

              {connected ? (
                <div className="flex flex-col flex-1 min-h-0">
                  {status === "loading" && (
                    <p className="text-[12.5px] px-5 pb-4" style={{ color: theme.textDim }}>
                      Fetching your wishlist and library…
                    </p>
                  )}
                  {status === "error" && (
                    <p className="text-[12.5px] px-5 pb-4" style={{ color: theme.textDim }}>
                      Couldn't load your data: {error}
                    </p>
                  )}

                  {status === "success" && (
                    <>
                      {libraryPublic === false && (
                        <p className="text-[11px] px-5 pb-2" style={{ color: "#fbbf24" }}>
                          Your game details are private, so your library can't be checked — only the wishlist works right now.
                        </p>
                      )}

                      <div className="flex gap-1 px-5 pb-3 shrink-0 overflow-x-auto">
                        {TABS.map((t) => (
                          <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1.5 rounded-sm whitespace-nowrap transition-colors duration-150"
                            style={
                              tab === t.key
                                ? { background: "#2fb4ff", color: "#051622" }
                                : { background: theme.chipBg, color: theme.chipText }
                            }
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
                        {tab === "matches" && (
                          <div className="flex flex-col gap-1.5">
                            {matches.length === 0 && (
                              <p className="text-[12px]" style={{ color: theme.textDim }}>
                                Nothing on your wishlist is in the current giveaway list right now.
                              </p>
                            )}
                            {matches.map((g) => (
                              <a
                                key={g.id}
                                href={g.open_giveaway_url || g.gamerpower_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ background: "#fbbf241a", borderColor: "#fbbf24" }}
                                className="tap-target flex items-center justify-between gap-2 px-3 py-2.5 border transition-transform duration-150 hover:scale-[1.02]"
                              >
                                <span className="text-[12.5px] font-bold leading-snug line-clamp-1" style={{ color: theme.text }}>
                                  {g.title}
                                </span>
                                <span className="text-[10px] font-black uppercase shrink-0" style={{ color: "#fbbf24" }}>
                                  Claim →
                                </span>
                              </a>
                            ))}
                          </div>
                        )}

                        {tab === "wishlist" && (
                          <div className="flex flex-col gap-1.5">
                            {wishlistGames.length === 0 && (
                              <p className="text-[12px]" style={{ color: theme.textDim }}>
                                Your wishlist is empty, or set to private.
                              </p>
                            )}
                            {wishlistGames.map((g) => (
                              <GameRow key={g.appid} {...g} theme={theme} />
                            ))}
                          </div>
                        )}

                        {tab === "library" && (
                          <div className="flex flex-col gap-1.5">
                            {libraryGames.length === 0 && (
                              <p className="text-[12px]" style={{ color: theme.textDim }}>
                                {libraryPublic === false ? "Game details are private." : "No games found."}
                              </p>
                            )}
                            {libraryGames.map((g) => (
                              <GameRow key={g.appid} {...g} theme={theme} />
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="p-5 pt-3 shrink-0 flex flex-col gap-2" style={{ borderTop: `1px solid ${theme.panelBorder}` }}>
                    {steamid && steamid !== "MOCK" && (
                      <a
                        href={`https://steamcommunity.com/profiles/${steamid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tap-target w-full text-center text-[12px] font-bold px-3 py-2 rounded-sm border-2 transition-colors duration-150"
                        style={{ borderColor: "#2fb4ff", color: "#2fb4ff", background: "#2fb4ff14" }}
                      >
                        View my real Steam profile ↗
                      </a>
                    )}
                    <button
                      onClick={() => {
                        disconnect();
                        setOpen(false);
                      }}
                      className="tap-target w-full text-[12px] font-bold px-3 py-2 rounded-sm border-2"
                      style={{ borderColor: theme.chipBorder, color: theme.chipText, background: theme.chipBg }}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-5 pt-0">
                  <p className="text-[12px] leading-snug" style={{ color: theme.textDim }}>
                    Your profile's wishlist and game details need to be set to <strong>public</strong> for this to work. Nothing is stored except your SteamID, in your browser only — we never see your password.
                  </p>

                  <a
                    href="/api/auth/steam-login"
                    className="tap-target flex items-center justify-center gap-2 text-[13px] font-black px-3 py-3 rounded-sm uppercase tracking-wide"
                    style={{ background: "#2fb4ff", color: "#051622" }}
                  >
                    <SiSteam size={16} />
                    Sign in through Steam
                  </a>
                  {import.meta.env.DEV && (
                    <p className="text-[10.5px]" style={{ color: theme.textFaint }}>
                      Note: sign-in only works on the deployed site or via `vercel dev` — plain `npm run dev` can't run the /api redirect this needs.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowManual((v) => !v)}
                    className="text-[11px] font-bold underline self-start"
                    style={{ color: theme.textFaint }}
                  >
                    {showManual ? "Hide manual entry" : "Or enter your SteamID manually"}
                  </button>

                  {showManual && (
                    <form onSubmit={handleConnect} className="flex flex-col gap-3">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g. 76561198012345678 or your profile name"
                        className="tap-target px-3 py-2.5 text-[13px] rounded-sm border-2 outline-none"
                        style={{ background: theme.chipBg, borderColor: theme.chipBorder, color: theme.text }}
                      />
                      <button
                        type="submit"
                        className="tap-target text-[12.5px] font-black px-3 py-2.5 rounded-sm uppercase tracking-wide border-2"
                        style={{ borderColor: theme.chipBorder, color: theme.chipText, background: theme.chipBg }}
                      >
                        Connect
                      </button>
                      <p className="text-[10.5px]" style={{ color: theme.textFaint }}>
                        Find your SteamID64 at{" "}
                        <a href="https://steamid.io" target="_blank" rel="noopener noreferrer" className="underline">
                          steamid.io
                        </a>{" "}
                        if you're not sure what it is.
                      </p>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
