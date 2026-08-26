import { useEffect, useState } from "react";

// Hits our own /api/trial-news serverless function (see api/trial-news.js),
// not the publisher feeds directly — that's what avoids the CORS problem.
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
        // Fails silently on purpose — this whole section is a bonus
        // extra, not core functionality. The main giveaway grid should
        // never be affected by this endpoint being down.
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, status };
}
