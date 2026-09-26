import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu";

// Full-screen image viewer. Portaled to <body> so it sits above the Nav
// (page content lives in its own stacking context). Shared between the
// screenshot gallery and news-post images — `images` is a plain array of
// URL strings either way.
export default function ImageLightbox({ images, index, setIndex, onClose }) {
  const go = (dir) => setIndex((index + dir + images.length) % images.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const src = images[index];
  if (!src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1010] flex items-center justify-center bg-black/90 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <img
        src={src}
        alt=""
        className="max-w-full max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer hover:bg-white/20"
      >
        <LuX size={20} />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Previous"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer hover:bg-white/20"
          >
            <LuChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Next"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer hover:bg-white/20"
          >
            <LuChevronRight size={22} />
          </button>
        </>
      )}
      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] font-black text-white/80">
        {index + 1} / {images.length}
      </span>
    </div>,
    document.body,
  );
}
