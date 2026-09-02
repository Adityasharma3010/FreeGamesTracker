import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "fgt-steam-profile"; // stores { input, steamid } — nothing sensitive, just the ID

const SteamContext = createContext(null);

// Same reasoning as useTrialNews.js: plain `npm run dev` can't run /api
// functions at all, so without a fallback there'd be no way to see or
// test this UI locally without deploying first.
const MOCK_DATA = {
  steamid: "MOCK",
  libraryPublic: true,
  libraryGames: [
    { appid: 730, name: "Counter-Strike 2", icon: null },
    { appid: 570, name: "Dota 2", icon: null },
  ],
  wishlistGames: [{ appid: 1245620, name: "Elden Ring", icon: null }],
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
  const [data, setData] = useState(null); // { steamid, libraryPublic, libraryGames, wishlistGames }
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState(null);

  // Picks up the ?steamid= (or ?steamAuthError=1) param that
  // api/auth/steam-callback.js redirects back to after a successful (or
  // failed) "Sign in through Steam" login, then strips it from the URL
  // so it isn't left visible/bookmarkable/re-triggered on refresh.
  useEffect(() => {
    const url = new URL(window.location.href);
    const loggedInId = url.searchParams.get("steamid");
    const authError = url.searchParams.get("steamAuthError");

    if (loggedInId && /^\d{17}$/.test(loggedInId)) {
      const next = { input: loggedInId, steamid: loggedInId };
      setProfile(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
    } else if (authError) {
      setError("Steam sign-in didn't complete — please try again.");
      setStatus("error");
    }

    if (loggedInId || authError) {
      url.searchParams.delete("steamid");
      url.searchParams.delete("steamAuthError");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

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

  const wishlistSet = new Set((data?.wishlistGames || []).map((g) => g.appid));
  const librarySet = new Set((data?.libraryGames || []).map((g) => g.appid));

  return (
    <SteamContext.Provider
      value={{
        connected: !!profile,
        connect,
        disconnect,
        status,
        error,
        steamid: data?.steamid || profile?.steamid || null,
        libraryPublic: data?.libraryPublic ?? null,
        libraryGames: data?.libraryGames || [],
        wishlistGames: data?.wishlistGames || [],
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
