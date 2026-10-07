import { useEffect, useRef, useState } from "react";

// Becomes `true` the first time the element scrolls into view, then stays
// true. Used to start bar animations when you actually see them (a
// section far down the page would otherwise finish animating unseen).
// Without IntersectionObserver (very old browsers) it's `true` right away.
export function useInViewOnce(threshold = 0.2) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);

  return [ref, seen];
}
