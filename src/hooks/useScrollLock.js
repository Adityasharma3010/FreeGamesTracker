import { useEffect } from "react";

// Stops the page behind a popup from scrolling while it's open. Several
// popups can be open at once (a lightbox over a news post, say), so this
// counts them: the page unlocks only when the last one closes. The
// scrollbar's width is added back as padding so the page doesn't jump
// sideways when the scrollbar disappears.
let locks = 0;
let saved = null;

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    if (locks === 0) {
      const scrollbar =
        window.innerWidth - document.documentElement.clientWidth;
      saved = {
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight,
      };
      body.style.overflow = "hidden";
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    }
    locks++;
    return () => {
      locks--;
      if (locks === 0 && saved) {
        body.style.overflow = saved.overflow;
        body.style.paddingRight = saved.paddingRight;
        saved = null;
      }
    };
  }, [active]);
}
