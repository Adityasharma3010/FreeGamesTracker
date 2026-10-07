import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuDownload, LuShare2, LuX } from "react-icons/lu";
import { renderCompareCard } from "../lib/compareCard.js";

const slug = (s) =>
  String(s || "player")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "player";

// Preview of the downloadable comparison card, with Download / Share.
// The card is drawn once when this opens (see lib/compareCard.js).
export default function CompareCardModal({
  me,
  them,
  both,
  spotlight,
  theme,
  onClose,
}) {
  const [format, setFormat] = useState("portrait"); // "portrait" | "landscape"
  const [cards, setCards] = useState({}); // format -> { status, blob, url }
  // Levels load a moment after the page does; if one arrives while the
  // window is open, the card is simply drawn again with it.
  const cacheKey = `${format}|${me.level ?? ""}|${them.level ?? ""}`;
  const state = cards[cacheKey] || { status: "loading", blob: null, url: null };
  const filename = `fgt-${slug(me.name)}-vs-${slug(them.name)}${format === "landscape" ? "-wide" : ""}.png`;

  // Each shape is drawn the first time it's shown, then kept.
  useEffect(() => {
    if (cards[cacheKey]) return;
    let cancelled = false;
    renderCompareCard({
      me,
      them,
      both,
      spotlight,
      host: window.location.host,
      format,
    })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setCards((c) => ({ ...c, [cacheKey]: { status: "ready", blob, url } }));
      })
      .catch(() => {
        if (!cancelled)
          setCards((c) => ({
            ...c,
            [cacheKey]: { status: "error", blob: null, url: null },
          }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // Free the generated images when the window closes.
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  useEffect(
    () => () => {
      Object.values(cardsRef.current).forEach(
        (c) => c?.url && URL.revokeObjectURL(c.url),
      );
    },
    [],
  );

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const file = useMemo(
    () =>
      state.blob
        ? new File([state.blob], filename, { type: "image/png" })
        : null,
    [state.blob, filename],
  );
  const canShare =
    !!file &&
    typeof navigator !== "undefined" &&
    navigator.canShare?.({ files: [file] });

  const share = async () => {
    try {
      await navigator.share({
        files: [file],
        title: `${me.name} vs ${them.name}`,
      });
    } catch {
      /* cancelled */
    }
  };

  const btn =
    "tap-target flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-4 py-2 cursor-pointer transition-[filter] duration-150 hover:brightness-110";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Comparison card"
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)" }}
        onClick={onClose}
      />
      <div
        className="relative flex flex-col gap-3 max-h-[94vh] w-[min(94vw,760px)] p-3 border-2"
        style={{
          background: theme.panelBg || "#0b0e16",
          borderColor: "#e879f9",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            className="text-[12px] font-black uppercase tracking-wide"
            style={{ color: theme.text }}
          >
            Your comparison card
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

        <div className="flex gap-1.5" role="tablist" aria-label="Card shape">
          {[
            ["portrait", "Portrait"],
            ["landscape", "Wide"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={format === key}
              onClick={() => setFormat(key)}
              className="tap-target text-[10.5px] font-black uppercase tracking-wide px-3 py-1.5 border cursor-pointer transition-colors duration-150"
              style={{
                background: format === key ? "#e879f9" : "transparent",
                color: format === key ? "#1a0620" : theme.textFaint,
                borderColor: format === key ? "#e879f9" : theme.surfaceBorder,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 overflow-auto flex items-center justify-center">
          {state.status === "loading" && (
            <p className="py-24 text-[12px]" style={{ color: theme.textDim }}>
              Drawing your card…
            </p>
          )}
          {state.status === "error" && (
            <p className="py-24 text-[12px]" style={{ color: theme.textDim }}>
              Couldn't create the card. Try again in a moment.
            </p>
          )}
          {state.status === "ready" && (
            <img
              src={state.url}
              alt={`${me.name} vs ${them.name} comparison card`}
              className="block max-h-[62vh] w-auto max-w-full"
            />
          )}
        </div>

        {state.status === "ready" && (
          <>
            <div className="flex flex-wrap gap-2">
              <a
                href={state.url}
                download={filename}
                className={btn}
                style={{ background: "#2fb4ff", color: "#06121c" }}
              >
                <LuDownload size={14} /> Download
              </a>
              {canShare && (
                <button
                  type="button"
                  onClick={share}
                  className={`${btn} border`}
                  style={{
                    borderColor: "rgba(255,255,255,0.3)",
                    color: "#fff",
                  }}
                >
                  <LuShare2 size={14} /> Share
                </button>
              )}
            </div>
            <p className="text-[10.5px]" style={{ color: theme.textFaint }}>
              Portrait suits phones and stories, Wide suits Discord and X. On a
              phone you can also press and hold the image to save it.
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
