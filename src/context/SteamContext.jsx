import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const STORAGE_KEY = "fgt-steam-profile"; // stores { input, steamid } — nothing sensitive, just the ID

const SteamContext = createContext(null);

// Same reasoning as useTrialNews.js: plain `npm run dev` can't run /api
// functions at all, so without a fallback there'd be no way to see or
// test this UI locally without deploying first.
const MOCK_DATA = {
  steamid: "MOCK",
  profile: {
    personaname: "Sample Player",
    avatar: null,
    profileUrl: "https://steamcommunity.com",
    visibility: "public",
  },
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
  const [equipped, setEquipped] = useState(null); // avatar frame / profile background — purely cosmetic, may stay null

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

    const param = profile.steamid
      ? `steamid=${profile.steamid}`
      : `vanity=${encodeURIComponent(profile.input)}`;
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
        // IMPORTANT: this used to silently fall back to mock data
        // whenever import.meta.env.DEV was true — but that's ALSO true
        // under `vercel dev`, not just plain `npm run dev` (vercel dev
        // still runs Vite's own dev server underneath). That meant a
        // REAL failure — wrong API key, Steam rate limit, a private
        // profile, anything — got silently masked as "success" with
        // fake CS2/Dota2 data, with no way to tell something was
        // actually broken. Always surface the real error now; mock
        // data is opt-in only, via useMockData() below.
        setError(err.message);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.steamid, profile?.input]);

  // Equipped cosmetics (frame/background) load separately from the main
  // data so a failure here never affects wishlist/library — worst case
  // the plain avatar and a gradient background are used.
  useEffect(() => {
    const id = data?.steamid;
    if (!id || id === "MOCK") {
      setEquipped(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/steam-profile?steamid=${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!cancelled) setEquipped(body && !body.error ? body : null);
      })
      .catch(() => {
        if (!cancelled) setEquipped(null);
      });
    return () => {
      cancelled = true;
    };
  }, [data?.steamid]);

  // Keeps a live-ish view of "online"/"in a game" going while the page
  // is left open, instead of only ever reflecting the moment you first
  // connected. Deliberately does NOT re-run the heavy api/steam-profile
  // fetch (which walks achievements across several games) — just a
  // cheap GetPlayerSummaries call for you + your already-known friends.
  const friendIdsRef = useRef([]);
  useEffect(() => {
    friendIdsRef.current = (equipped?.friends || []).map((f) => f.steamid);
  }, [equipped?.friends]);

  useEffect(() => {
    const id = data?.steamid;
    if (!id || id === "MOCK" || status !== "success") return;

    let cancelled = false;
    const poll = () => {
      if (document.visibilityState !== "visible") return; // skip while the tab isn't in view
      const friendIds = friendIdsRef.current.join(",");
      fetch(
        `/api/steam-status?steamid=${id}${friendIds ? `&friendIds=${friendIds}` : ""}`,
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((body) => {
          if (cancelled || !body) return;
          if (body.self) {
            setData((prev) =>
              prev
                ? { ...prev, profile: { ...prev.profile, ...body.self } }
                : prev,
            );
          }
          if (body.friends && Object.keys(body.friends).length > 0) {
            setEquipped((prev) =>
              prev
                ? {
                    ...prev,
                    friends: prev.friends.map((f) =>
                      body.friends[f.steamid]
                        ? { ...f, ...body.friends[f.steamid] }
                        : f,
                    ),
                  }
                : prev,
            );
          }
        })
        .catch(() => {}); // a missed poll just means stale status until the next one — never surfaced as an error
    };

    const interval = setInterval(poll, 45000);
    // Also catch up immediately when the tab regains focus, instead of
    // waiting for the next scheduled tick after being away a while.
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [data?.steamid, status]);

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
    setEquipped(null);
    setStatus("idle");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  // Dev-only, explicit opt-in — never triggered automatically. Lets you
  // preview the UI's look with fake data when you know the real API
  // genuinely isn't reachable (e.g. testing under plain `npm run dev`,
  // which can't execute /api at all), without that ever masking a real
  // bug the way the old automatic fallback did.
  const useMockData = () => {
    setData(MOCK_DATA);
    setStatus("success");
    setError(null);
  };

  const wishlistSet = new Set((data?.wishlistGames || []).map((g) => g.appid));
  const librarySet = new Set((data?.libraryGames || []).map((g) => g.appid));

  return (
    <SteamContext.Provider
      value={{
        connected: !!profile,
        connect,
        disconnect,
        useMockData,
        status,
        error,
        steamid: data?.steamid || profile?.steamid || null,
        playerProfile: data?.profile || null,
        equipped,
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
