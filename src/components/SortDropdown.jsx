import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import { LuChevronDown } from "react-icons/lu";

const OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "ending", label: "Ending soonest" },
];

// The filter bar uses clip-path for its angular corners, and clip-path
// clips EVERY descendant — including absolutely-positioned ones — to the
// parent's shape. That's why the options panel was disappearing: it was
// rendered inside that clipped container. Rendering it into a portal on
// document.body sidesteps that entirely; position is computed from the
// trigger button's real screen coordinates instead.
export default function SortDropdown({ value, onChange }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const updateCoords = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    // Left-align to the button's left edge — simpler and more predictable
    // than right-edge + transform, which was landing off to the side.
    // Clamp so it never runs past the right edge of the viewport either.
    const panelWidth = Math.max(r.width, 160);
    const left = Math.min(r.left, window.innerWidth - panelWidth - 8);
    setCoords({ top: r.bottom + 6, left, width: panelWidth });
  };

  useLayoutEffect(() => {
    if (open) updateCoords();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (btnRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open]);

  const current = OPTIONS.find((o) => o.value === value) || OPTIONS[0];

  return (
    <div className="ml-1">
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="tap-target text-[11.5px] font-bold px-2.5 py-1.5 rounded-sm border-2 uppercase tracking-wide flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95"
        style={
          open
            ? { borderColor: "#e879f9", color: "#e879f9", background: "#e879f922", boxShadow: "0 0 14px #e879f966" }
            : { background: theme.chipBg, borderColor: theme.chipBorder, color: theme.chipText }
        }
      >
        {current.label}
        <LuChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[999] border-2 backdrop-blur-xl overflow-hidden motion-safe:animate-card-in"
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              background: theme.panelBg,
              borderColor: theme.panelBorder,
              clipPath: "polygon(8px 0,100% 0,100% 100%,0 100%,0 8px)",
              boxShadow: "0 20px 45px -15px rgba(0,0,0,0.6)",
            }}
          >
            {OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="tap-target w-full text-left text-[11.5px] font-bold px-3 py-2.5 uppercase tracking-wide whitespace-nowrap transition-colors duration-150"
                style={
                  o.value === value
                    ? { color: "#e879f9", background: "#e879f91a" }
                    : { color: theme.chipText, background: "transparent" }
                }
                onMouseEnter={(e) => {
                  if (o.value !== value) e.currentTarget.style.background = theme.chipBg;
                }}
                onMouseLeave={(e) => {
                  if (o.value !== value) e.currentTarget.style.background = "transparent";
                }}
              >
                {o.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
