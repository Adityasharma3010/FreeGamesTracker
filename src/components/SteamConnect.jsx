import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSteam } from "../context/SteamContext.jsx";
import { useGiveaways } from "../hooks/useGiveaways.js";
import { extractSteamAppId } from "../lib/steamMatch.js";
import { SiSteam } from "react-icons/si";
import { LuX } from "react-icons/lu";

export default function SteamConnect() {
  const { theme } = useTheme();
  const { connected, connect, disconnect, status, error, isWishlisted } = useSteam();
  // Reads the same 10-min localStorage cache useGiveaways already keeps —
  // this does NOT trigger a second network fetch if that cache is fresh.
  const { giveaways } = useGiveaways();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

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
          // Rendered into document.body on purpose — Nav uses
          // backdrop-blur, and CSS makes any ancestor with a
          // backdrop-filter/filter the containing block for `position:
          // fixed` descendants instead of the real viewport. Without
          // this portal, the modal centers relative to the 64px Nav bar
          // instead of the screen. Same root cause and same fix as the
          // sort-dropdown positioning bug from earlier.
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm max-h-[85vh] overflow-y-auto border-2 backdrop-blur-xl p-5"
              style={{
                background: theme.panelBg,
                borderColor: theme.panelBorder,
                clipPath: "polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2" style={{ color: theme.text }}>
                  <SiSteam size={16} />
                  Connect Steam
                </h2>
                <button onClick={() => setOpen(false)} style={{ color: theme.textFaint }} aria-label="Close">
                  <LuX size={18} />
                </button>
              </div>

              {connected ? (
                <div className="flex flex-col gap-3">
                  <p className="text-[12.5px]" style={{ color: theme.textDim }}>
                    {status === "loading" && "Fetching your wishlist and library…"}
                    {status === "success" &&
                      (matches.length > 0
                        ? `${matches.length} giveaway${matches.length > 1 ? "s" : ""} currently on your Steam wishlist:`
                        : "Connected — nothing on your wishlist is in the current giveaway list.")}
                    {status === "error" && `Couldn't load your data: ${error}`}
                  </p>

                  {matches.length > 0 && (
                    <div className="flex flex-col gap-1.5 -mx-1 px-1 max-h-64 overflow-y-auto">
                      {matches.map((g) => (
                        <a
                          key={g.id}
                          href={g.open_giveaway_url || g.gamerpower_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: theme.surface, borderColor: theme.surfaceBorder }}
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

                  <button
                    onClick={() => {
                      disconnect();
                      setOpen(false);
                    }}
                    className="tap-target text-[12px] font-bold px-3 py-2 rounded-sm border-2"
                    style={{ borderColor: theme.chipBorder, color: theme.chipText, background: theme.chipBg }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConnect} className="flex flex-col gap-3">
                  <p className="text-[12px] leading-snug" style={{ color: theme.textDim }}>
                    Paste your SteamID64 or custom profile URL name. Your profile's wishlist and game details need to be set to <strong>public</strong> for this to work — nothing is stored except this ID, in your browser only.
                  </p>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g. 76561198012345678 or your profile name"
                    autoFocus
                    className="tap-target px-3 py-2.5 text-[13px] rounded-sm border-2 outline-none"
                    style={{ background: theme.chipBg, borderColor: theme.chipBorder, color: theme.text }}
                  />
                  <button
                    type="submit"
                    className="tap-target text-[12.5px] font-black px-3 py-2.5 rounded-sm uppercase tracking-wide"
                    style={{ background: "#2fb4ff", color: "#051622" }}
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
          </div>,
          document.body
        )}
    </>
  );
}
