import React, { useEffect, useRef, useState } from "react";
import { LuCheck, LuLink } from "react-icons/lu";

// Copies `path` (e.g. "/steam/compare/123/456") as a full URL on this
// site. Falls back to a hidden textarea + execCommand when the Clipboard
// API isn't available (older browsers / non-secure contexts).
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function CopyLinkButton({ path, theme, label = "Copy link" }) {
  const [state, setState] = useState("idle"); // idle | copied | failed
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = async () => {
    const ok = await copyText(`${window.location.origin}${path}`);
    setState(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-target shrink-0 flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border cursor-pointer transition-colors duration-150 hover:bg-white/10"
      style={{
        borderColor: state === "copied" ? "#7dff70" : theme.surfaceBorder,
        color: state === "copied" ? "#7dff70" : theme.textFaint,
      }}
    >
      {state === "copied" ? <LuCheck size={12} /> : <LuLink size={12} />}
      <span aria-live="polite">
        {state === "copied"
          ? "Link copied"
          : state === "failed"
            ? "Couldn't copy"
            : label}
      </span>
    </button>
  );
}
