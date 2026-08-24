import { useEffect, useState, useCallback } from "react";

// GamerPower's public API — no key/auth needed, CORS-enabled for
// client-side fetch. Docs: https://www.gamerpower.com/api-read
const API_URL = "https://www.gamerpower.com/api/giveaways";

const CACHE_KEY = "fgt-giveaways-cache-v1";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes — data doesn't change second to second

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* storage full/unavailable — fine, just skip caching */
  }
}

export function useGiveaways() {
  const [giveaways, setGiveaways] = useState(() => readCache() || []);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState(null);

  const load = useCallback(async ({ force = false } = {}) => {
    if (!force) {
      const cached = readCache();
      if (cached) {
        setGiveaways(cached);
        setStatus("success");
        return;
      }
    }

    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`GamerPower API responded ${res.status}`);
      const data = await res.json();
      setGiveaways(data);
      writeCache(data);
      setStatus("success");
    } catch (err) {
      setError(err.message || "Failed to load giveaways");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { giveaways, status, error, refresh: () => load({ force: true }) };
}
