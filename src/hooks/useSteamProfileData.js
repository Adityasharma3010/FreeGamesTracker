import { useEffect, useState } from "react";

// Cached per steamid for the session — going back and forth between your
// own profile and a friend's (or between two friends) reuses what was
// already fetched instead of re-hitting /api/steam and /api/steam-profile
// every time. Short TTL (2 min) rather than indefinite: this data includes
// online/in-game status and library changes, which should still catch up
// within a normal browsing session rather than going stale for good.
const PROFILE_CACHE_TTL_MS = 2 * 60 * 1000;
const profileDataCache = new Map(); // steamid -> { fetchedAt, data }
const equippedCache = new Map(); // steamid -> { fetchedAt, equipped }

// Read-only fetch of ANY public Steam profile by steamid — same two
// endpoints SteamContext uses for the connected account (/api/steam,
// /api/steam-profile), just without the connect/disconnect/localStorage/
// OpenID/polling machinery that only makes sense for "the account this
// browser is signed in as". Used to view a friend's profile in-app.
export function useSteamProfileData(steamid) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [equipped, setEquipped] = useState(null);

  useEffect(() => {
    if (!steamid) {
      setStatus("idle");
      setData(null);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setError(null);
    setData(null);
    setEquipped(null);

    const cached = profileDataCache.get(steamid);
    if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_TTL_MS) {
      setData(cached.data);
      setStatus("success");
    } else {
      fetch(`/api/steam?steamid=${steamid}`)
        .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
        .then(({ ok, body }) => {
          if (cancelled) return;
          if (!ok) throw new Error(body.error || "Something went wrong.");
          profileDataCache.set(steamid, { fetchedAt: Date.now(), data: body });
          setData(body);
          setStatus("success");
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err.message);
          setStatus("error");
        });
    }

    return () => {
      cancelled = true;
    };
  }, [steamid]);

  useEffect(() => {
    if (!steamid) return;
    let cancelled = false;

    const cached = equippedCache.get(steamid);
    if (cached && Date.now() - cached.fetchedAt < PROFILE_CACHE_TTL_MS) {
      setEquipped(cached.equipped);
      return;
    }

    fetch(`/api/steam-profile?steamid=${steamid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (cancelled) return;
        const value = body && !body.error ? body : null;
        equippedCache.set(steamid, { fetchedAt: Date.now(), equipped: value });
        setEquipped(value);
      })
      .catch(() => {
        if (!cancelled) setEquipped(null);
      });
    return () => {
      cancelled = true;
    };
  }, [steamid]);

  const wishlistSet = new Set((data?.wishlistGames || []).map((g) => g.appid));
  const librarySet = new Set((data?.libraryGames || []).map((g) => g.appid));

  return {
    status,
    error,
    steamid: data?.steamid || steamid || null,
    playerProfile: data?.profile || null,
    equipped,
    libraryPublic: data?.libraryPublic ?? null,
    libraryGames: data?.libraryGames || [],
    wishlistGames: data?.wishlistGames || [],
    isWishlisted: (appId) => appId != null && wishlistSet.has(appId),
    isOwned: (appId) => appId != null && librarySet.has(appId),
  };
}
