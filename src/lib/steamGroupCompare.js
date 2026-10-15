// Compare 3+ players at once. Pure functions over data the page already
// loaded — no extra requests.
//
// player = { steamid, name, library: [{appid,name,playtime}],
//            wishlist: [{appid,name}], libraryHidden }
// playtime is in MINUTES.

// One colour per player, in order: you, then the friends.
export const GROUP_COLORS = [
  "#2fb4ff",
  "#e879f9",
  "#7dff70",
  "#fbbf24",
  "#fb7185",
  "#a78bfa",
];
export const MAX_GROUP_PLAYERS = GROUP_COLORS.length;

const isPlaceholder = (n) => !n || /^App \d+$/.test(String(n));
const mins = (g) => Math.max(0, Number(g?.playtime) || 0);

export function compareGroup(players) {
  // Someone with a private library can't be counted for ownership; someone
  // with an empty/private wishlist can't be counted for wishlists.
  const withLibrary = players.filter((p) => !p.libraryHidden);
  const withWishlist = players.filter((p) => p.wishlist.length > 0);

  const libOf = new Map(
    players.map((p) => [
      p.steamid,
      new Map(p.library.map((g) => [g.appid, g])),
    ]),
  );
  const wishOf = new Map(
    players.map((p) => [
      p.steamid,
      new Map(p.wishlist.map((g) => [g.appid, g])),
    ]),
  );

  // The same game can be "App 123" in one list and have its real name in
  // another (Steam's name lookup misses now and then) — take any real one.
  const nameOf = (appid) => {
    for (const p of players) {
      const n = libOf.get(p.steamid).get(appid)?.name;
      if (!isPlaceholder(n)) return n;
    }
    for (const p of players) {
      const n = wishOf.get(p.steamid).get(appid)?.name;
      if (!isPlaceholder(n)) return n;
    }
    return `App ${appid}`;
  };

  const ownersOf = (appid) =>
    withLibrary.filter((p) => libOf.get(p.steamid).has(appid));
  const playsOf = (appid, owners) =>
    owners.map((p) => ({
      steamid: p.steamid,
      minutes: mins(libOf.get(p.steamid).get(appid)),
    }));
  const total = (plays) => plays.reduce((s, x) => s + x.minutes, 0);

  const allAppids = new Set();
  withLibrary.forEach((p) => p.library.forEach((g) => allAppids.add(g.appid)));

  const everyoneOwns = [];
  const allButOne = [];
  if (withLibrary.length >= 2) {
    for (const appid of allAppids) {
      const owners = ownersOf(appid);
      if (owners.length === withLibrary.length) {
        const plays = playsOf(appid, owners);
        everyoneOwns.push({
          appid,
          name: nameOf(appid),
          plays,
          total: total(plays),
        });
      } else if (
        withLibrary.length >= 3 &&
        owners.length === withLibrary.length - 1
      ) {
        const missing = withLibrary.find((p) => !owners.includes(p));
        const plays = playsOf(appid, owners);
        allButOne.push({
          appid,
          name: nameOf(appid),
          plays,
          total: total(plays),
          missing: missing.steamid,
        });
      }
    }
  }
  const byHours = (a, b) => b.total - a.total || a.name.localeCompare(b.name);
  everyoneOwns.sort(byHours);
  allButOne.sort(byHours);

  const wantedCount = new Map();
  withWishlist.forEach((p) =>
    p.wishlist.forEach((g) =>
      wantedCount.set(g.appid, (wantedCount.get(g.appid) || 0) + 1),
    ),
  );
  const everyoneWants = [];
  const wishedByMany = [];
  for (const [appid, count] of wantedCount) {
    const wantedBy = withWishlist
      .filter((p) => wishOf.get(p.steamid).has(appid))
      .map((p) => p.steamid);
    if (withWishlist.length >= 2 && count === withWishlist.length) {
      everyoneWants.push({ appid, name: nameOf(appid), wantedBy });
    } else if (count >= 2) {
      wishedByMany.push({
        appid,
        name: nameOf(appid),
        wantedBy,
        ownedBy: ownersOf(appid).map((p) => p.steamid),
      });
    }
  }
  everyoneWants.sort((a, b) => a.name.localeCompare(b.name));
  wishedByMany.sort(
    (a, b) =>
      b.wantedBy.length - a.wantedBy.length ||
      b.ownedBy.length - a.ownedBy.length ||
      a.name.localeCompare(b.name),
  );

  const scoreboard = players.map((p) => {
    const minutes = p.library.reduce((s, g) => s + mins(g), 0);
    return {
      steamid: p.steamid,
      hidden: !!p.libraryHidden,
      games: p.library.length,
      hours: minutes / 60,
    };
  });

  return {
    everyoneOwns,
    allButOne,
    everyoneWants,
    wishedByMany,
    scoreboard,
    hiddenLibraries: players
      .filter((p) => p.libraryHidden)
      .map((p) => p.steamid),
    emptyWishlists: players
      .filter((p) => p.wishlist.length === 0)
      .map((p) => p.steamid),
  };
}
