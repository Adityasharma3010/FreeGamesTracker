import React, { useEffect, useMemo, useState } from "react";
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
  const [state, setState] = useState({
    status: "loading",
    blob: null,
    url: null,
  });
  const filename = `fgt-${slug(me.name)}-vs-${slug(them.name)}.png`;

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    renderCompareCard({
      me,
      them,
      both,
      spotlight,
      host: window.location.host,
    })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ status: "ready", blob, url: objectUrl });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", blob: null, url: null });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // The card is drawn once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        className="relative flex flex-col gap-3 max-h-[94vh] max-w-[min(94vw,520px)] p-3 border-2"
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
              className="block max-h-[68vh] w-auto max-w-full"
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
              On a phone you can also press and hold the image to save it.
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
