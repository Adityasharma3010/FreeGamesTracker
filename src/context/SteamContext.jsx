import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "fgt-steam-profile"; // stores { input, steamid } — nothing sensitive, just the ID

const SteamContext = createContext(null);

// Same reasoning as useTrialNews.js: plain `npm run dev` can't run /api
// functions at all, so without a fallback there'd be no way to see or
// test this UI locally without deploying first.
const MOCK_DATA = {
  steamid: "MOCK",
  libraryPublic: true,
  libraryAppIds: [730, 570], // CS2, Dota 2 — arbitrary sample IDs
  wishlistAppIds: [1245620], // Elden Ring — arbitrary sample ID
};

export function SteamProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [data, setData] = useState(null); // { steamid, libraryPublic, libraryAppIds, wishlistAppIds }
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profile) {
      setData(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(null);

    const param = profile.steamid ? `steamid=${profile.steamid}` : `vanity=${encodeURIComponent(profile.input)}`;
    fetch(`/api/steam?${param}`)
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) throw new Error(body.error || "Something went wrong.");
        setData(body);
        setStatus("success");
        // Persist the resolved 64-bit id so future loads skip vanity resolution
        if (body.steamid && body.steamid !== profile.steamid) {
          const next = { input: profile.input, steamid: body.steamid };
          setProfile(next);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {}
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (import.meta.env.DEV) {
          setData(MOCK_DATA);
          setStatus("success");
        } else {
          setError(err.message);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.steamid, profile?.input]);

  const connect = (input) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    // Accept a raw 64-bit SteamID (all digits, 17 chars) or a vanity name/URL
    const idMatch = trimmed.match(/^\d{17}$/);
    const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/]+)/i);
    const next = idMatch
      ? { input: trimmed, steamid: trimmed }
      : { input: vanityMatch ? vanityMatch[1] : trimmed, steamid: null };
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const disconnect = () => {
    setProfile(null);
    setData(null);
    setStatus("idle");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const wishlistSet = new Set(data?.wishlistAppIds || []);
  const librarySet = new Set(data?.libraryAppIds || []);

  return (
    <SteamContext.Provider
      value={{
        connected: !!profile,
        connect,
        disconnect,
        status,
        error,
        libraryPublic: data?.libraryPublic ?? null,
        isWishlisted: (appId) => appId != null && wishlistSet.has(appId),
        isOwned: (appId) => appId != null && librarySet.has(appId),
      }}
    >
      {children}
    </SteamContext.Provider>
  );
}

export function useSteam() {
  const ctx = useContext(SteamContext);
  if (!ctx) throw new Error("useSteam must be used inside <SteamProvider>");
  return ctx;
}
