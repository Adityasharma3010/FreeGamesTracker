import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useSteam } from "../context/SteamContext.jsx";
import { SiSteam } from "react-icons/si";
import { LuX } from "react-icons/lu";

export default function SteamConnect() {
  const { theme } = useTheme();
  const { connected, connect, disconnect, status, error } = useSteam();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const handleConnect = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    connect(input);
    setOpen(false);
    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="tap-target flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
        style={
          connected
            ? { borderColor: "#2fb4ff", color: "#2fb4ff", background: "#2fb4ff1a", boxShadow: "0 0 12px #2fb4ff55" }
            : { borderColor: theme.chipBorder, color: theme.chipText, background: theme.chipBg }
        }
      >
        <SiSteam size={13} />
        <span className="hidden sm:inline">{connected ? "Steam connected" : "Connect Steam"}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm border-2 backdrop-blur-xl p-5"
            style={{ background: theme.panelBg, borderColor: theme.panelBorder, clipPath: "polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)" }}
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
                  {status === "success" && "Connected — wishlist and owned games are checked against live giveaways below."}
                  {status === "error" && `Couldn't load your data: ${error}`}
                </p>
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
        </div>
      )}
    </>
  );
}
