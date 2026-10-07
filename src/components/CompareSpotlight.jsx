import React, { useState } from "react";
import { LuTrophy } from "react-icons/lu";
import { SiSteam } from "react-icons/si";
import SteamGameImage from "./SteamGameImage.jsx";
import { useInViewOnce } from "../hooks/useInViewOnce.js";
import { formatHours } from "../lib/steamCompare.js";

function HoursBar({ name, minutes, max, color, shown, delay }) {
  const pct = max > 0 ? Math.max(2, (minutes / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 sm:w-28 shrink-0 truncate text-[11px] font-bold text-white/85">
        {name}
      </span>
      <div className="flex-1 h-2 bg-white/15">
        <div
          className="h-full motion-reduce:transition-none"
          style={{
            width: shown ? `${pct}%` : "0%",
            background: color,
            transition: `width 1100ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
          }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-[11px] font-black tabular-nums text-white">
        {formatHours(minutes)}
      </span>
    </div>
  );
}

// Banner for the shared game you've BOTH put the most hours into.
// `game` is one entry of compareLibraries().both:
//   { appid, name, myPlaytime, theirPlaytime }   (minutes)
export default function CompareSpotlight({
  game,
  aName,
  bName,
  onOpen,
  onCompareAchievements,
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [ref, shown] = useInViewOnce();
  const max = Math.max(game.myPlaytime, game.theirPlaytime);

  return (
    <div
      ref={ref}
      className="p-[1.5px]"
      style={{
        background: "linear-gradient(90deg, #2fb4ff, #e879f9)",
        boxShadow: "0 0 40px rgba(232,121,249,0.18)",
      }}
    >
      <section
        className="relative overflow-hidden min-h-[190px] sm:min-h-[220px] flex"
        style={{ background: "#0b0e16" }}
        aria-label={`Top shared game: ${game.name}`}
      >
        {imgFailed ? (
          <div className="absolute inset-0 flex items-center justify-end pr-10">
            <SiSteam size={72} className="text-white/10" />
          </div>
        ) : (
          <SteamGameImage
            appid={game.appid}
            className="absolute inset-0 w-full h-full object-cover"
            onAllFailed={() => setImgFailed(true)}
          />
        )}
        {/* Dark fade from the left so the text stays readable on any art. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(8,10,16,0.94) 0%, rgba(8,10,16,0.82) 45%, rgba(8,10,16,0.25) 100%)",
          }}
        />

        <div className="relative z-10 flex flex-col justify-center gap-3 p-4 sm:p-6 w-full max-w-[560px]">
          <div>
            <span
              className="text-[10px] font-black uppercase tracking-wide"
              style={{ color: "#e879f9" }}
            >
              Top shared game
            </span>
            <h2 className="text-[20px] sm:text-[26px] font-black leading-tight text-white line-clamp-2">
              {game.name}
            </h2>
            <span className="text-[11.5px] text-white/70">
              {formatHours(game.myPlaytime + game.theirPlaytime)} played between
              you
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <HoursBar
              name={aName}
              minutes={game.myPlaytime}
              max={max}
              color="#2fb4ff"
              shown={shown}
              delay={150}
            />
            <HoursBar
              name={bName}
              minutes={game.theirPlaytime}
              max={max}
              color="#e879f9"
              shown={shown}
              delay={350}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="tap-target text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 cursor-pointer transition-colors duration-150 hover:brightness-110"
              style={{ background: "#2fb4ff", color: "#06121c" }}
            >
              View game
            </button>
            <button
              type="button"
              onClick={onCompareAchievements}
              className="tap-target flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border cursor-pointer transition-colors duration-150 hover:bg-white/10"
              style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
            >
              <LuTrophy size={12} /> Compare achievements
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
