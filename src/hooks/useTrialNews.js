import { useEffect, useState } from "react";

// Hits our own /api/trial-news serverless function (see api/trial-news.js),
// not the publisher feeds directly — that's what avoids the CORS problem.
//
// Plain `npm run dev` (Vite alone) can't execute /api functions at all —
// that only works on Vercel itself, or locally via `vercel dev`. So in
// dev mode, if the real fetch fails, fall back to sample mock data
// instead of silently showing nothing — otherwise there's no way to see
// or tweak this UI without deploying first. Production behavior is
// unaffected: the mock only kicks in when import.meta.env.DEV is true.
const MOCK_ITEMS = [
  {
    title: "[DEV MOCK] Modern Warfare 4 Open Beta: Everything You Need to Know",
    summary: "Sample data shown because /api isn't reachable in plain `npm run dev` — see useTrialNews.js.",
    link: "https://news.xbox.com",
    pubDate: new Date().toISOString(),
    source: "Xbox Wire",
    platform: "xboxseries",
  },
  {
    title: "[DEV MOCK] Free Play Days: Sample PlayStation Trial",
    summary: "Second sample row so you can see how the panel looks with multiple entries.",
    link: "https://blog.playstation.com",
    pubDate: new Date().toISOString(),
    source: "PlayStation Blog",
    platform: "ps5",
  },
];

export function useTrialNews() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trial-news")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then((data) => {
        if (!cancelled) {
          setItems(data.items || []);
          setStatus("success");
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          // Local dev only — see comment above.
          setItems(MOCK_ITEMS);
          setStatus("success");
        } else {
          // Production: fails silently on purpose — this whole section
          // is a bonus extra, not core functionality. The main giveaway
          // grid should never be affected by this endpoint being down.
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, status };
}

