import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import PlatformIcon from "./PlatformIcon.jsx";

export default function Chip({ active, onClick, label, color, platformKey }) {
  const { theme } = useTheme();
  const [hover, setHover] = useState(false);
  const c = color || "#e879f9";

  let style;
  if (active) {
    style = { borderColor: c, color: c, background: `${c}22`, boxShadow: hover ? `0 0 16px ${c}88` : `0 0 12px ${c}66` };
  } else if (hover) {
    style = { borderColor: c, color: c, background: `${c}14`, boxShadow: `0 0 10px ${c}55` };
  } else {
    style = { borderColor: theme.chipBorder, color: theme.chipText, background: theme.chipBg };
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={style}
      className="tap-target text-[11.5px] font-bold px-3 py-1.5 rounded-sm border-2 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 whitespace-nowrap uppercase tracking-wide"
    >
      {platformKey && <PlatformIcon platformKey={platformKey} size={13} />}
      {label}
    </button>
  );
}

