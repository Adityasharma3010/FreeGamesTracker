// Logic for the friend "Compare" tab and the Library "Pick a game" button.
// Plain functions over the wishlist/library arrays that are already
// loaded — no requests, no state — so they're easy to test.

import { normalize } from "./steamListControls.js";

// Minutes -> "12h". Under an hour reads "<1h" (not "0h", which would look
// like never played); never played is "0h".
export function formatHours(minutes) {
  const m = Number(minutes) || 0;
  if (m <= 0) return "0h";
  if (m < 60) return "<1h";
  const h = m / 60;
  return h < 10
    ? `${h.toFixed(1).replace(/\.0$/, "")}h`
    : `${Math.round(h).toLocaleString("en-US")}h`;
}

// Wishlist entries fall back to "App 123" when Steam's name lookup misses;
// library entries always carry the real name, so prefer those.
const isPlaceholder = (name) => !name || /^App \d+$/.test(name);
const bestName = (...names) =>
  names.find((n) => !isPlaceholder(n)) || names.find(Boolean) || "";

const byName = (a, b) =>
  normalize(a.name).localeCompare(normalize(b.name), undefined, {
    numeric: true,
  });

// Compares your lists with someone else's. Four groups:
//   both                 – games you both own (most hours put in together first)
//   theyOwnYourWishlist  – on YOUR wishlist, and THEY own it
//   youOwnTheirWishlist  – on THEIR wishlist, and YOU own it
//   bothWant             – on both wishlists
// Wishlist-based groups keep the wishlist owner's own ranked order.
export function compareLibraries({
  myLibrary = [],
  myWishlist = [],
  theirLibrary = [],
  theirWishlist = [],
}) {
  const mine = new Map(myLibrary.map((g) => [g.appid, g]));
  const theirs = new Map(theirLibrary.map((g) => [g.appid, g]));
  const theirWishIds = new Set(theirWishlist.map((g) => g.appid));
  const theirWishNames = new Map(theirWishlist.map((g) => [g.appid, g.name]));

  const both = [];
  for (const g of theirLibrary) {
    const m = mine.get(g.appid);
    if (!m) continue;
    both.push({
      appid: g.appid,
      name: bestName(g.name, m.name),
      myPlaytime: m.playtime || 0,
      theirPlaytime: g.playtime || 0,
    });
  }
  both.sort(
    (a, b) =>
      b.myPlaytime + b.theirPlaytime - (a.myPlaytime + a.theirPlaytime) ||
      byName(a, b),
  );

  const theyOwnYourWishlist = myWishlist
    .filter((g) => theirs.has(g.appid))
    .map((g) => {
      const t = theirs.get(g.appid);
      return {
        appid: g.appid,
        name: bestName(t.name, g.name),
        theirPlaytime: t.playtime || 0,
      };
    });

  const youOwnTheirWishlist = theirWishlist
    .filter((g) => mine.has(g.appid))
    .map((g) => {
      const m = mine.get(g.appid);
      return {
        appid: g.appid,
        name: bestName(m.name, g.name),
        myPlaytime: m.playtime || 0,
      };
    });

  // The same game can come back as "App 123" from one player's wishlist
  // and with its real name from the other's (Steam's name lookup misses
  // now and then), so look at both wishlists — and both libraries, which
  // always carry real names — before settling for the placeholder.
  const bothWant = myWishlist
    .filter((g) => theirWishIds.has(g.appid))
    .map((g) => ({
      appid: g.appid,
      name: bestName(
        g.name,
        theirWishNames.get(g.appid),
        mine.get(g.appid)?.name,
        theirs.get(g.appid)?.name,
      ),
    }));

  return { both, theyOwnYourWishlist, youOwnTheirWishlist, bothWant };
}

// "What should I play?" — a random game, favouring the backlog: if any of
// the given games have never been played, it picks only from those;
// otherwise from all of them. Pass the currently visible (searched /
// filtered) list to pick from what's on screen. `excludeAppid` avoids
// showing the same game twice in a row when there's another choice.
export function pickRandomGame(
  games,
  { excludeAppid = null, rng = Math.random } = {},
) {
  if (!games || games.length === 0) return null;
  const unplayed = games.filter((g) => !(g.playtime > 0));
  let pool = unplayed.length > 0 ? unplayed : games;
  if (excludeAppid != null && pool.length > 1) {
    pool = pool.filter((g) => g.appid !== excludeAppid);
  }
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

// Merges two /api/steam-achievements responses (yours and a friend's,
// for the SAME game) into one comparable list. Used by the "Compare
// achievements" modal on the Compare tab — fetched on demand for one
// game at a time, not for every shared game automatically, since that
// would mean two Steam calls per game.
//
// Both sides return the same achievement DEFINITIONS (names, icons,
// descriptions) when their stats are public — only which ones are
// unlocked differs. If one side's stats are private, its definitions
// come back empty (see api/steam-achievements.js), so this builds the
// row list from whichever side actually has it, and marks the other
// side "unknown" per achievement rather than guessing.
export function mergeAchievementCompare(mine, theirs) {
  const summary = {
    myTotal: mine?.total ?? 0,
    myUnlocked: mine?.unlocked ?? 0,
    myLocked: mine?.locked ?? null,
    theirTotal: theirs?.total ?? 0,
    theirUnlocked: theirs?.unlocked ?? 0,
    theirLocked: theirs?.locked ?? null,
  };

  const noAchievements = !mine?.found && !theirs?.found;
  if (noAchievements) return { summary, rows: [], noAchievements: true };

  const mineHasRows = (mine?.achievements?.length ?? 0) > 0;
  const theirsHasRows = (theirs?.achievements?.length ?? 0) > 0;
  const source = mineHasRows ? mine : theirsHasRows ? theirs : null;
  if (!source) return { summary, rows: [], noAchievements: false };

  const other = source === mine ? theirs : mine;
  const otherAchievedSet = new Set(
    (other?.achievements || []).filter((a) => a.achieved).map((a) => a.apiname),
  );
  const otherUnknown = !(other?.achievements?.length > 0);

  const rows = source.achievements.map((a) => {
    const mySide =
      source === mine ? a.achieved : otherAchievedSet.has(a.apiname);
    const theirSide =
      source === mine ? otherAchievedSet.has(a.apiname) : a.achieved;
    return {
      apiname: a.apiname,
      name: a.name,
      description: a.description,
      hidden: a.hidden,
      icon: a.icon,
      iconGray: a.iconGray,
      globalPercent: a.globalPercent,
      mine: mySide,
      theirs: source === mine ? theirSide : theirSide,
      theirsUnknown: source === mine ? otherUnknown : false,
      mineUnknown: source === theirs ? otherUnknown : false,
    };
  });

  // Both-have-it first (a shared win), then only-me, only-them, then
  // neither — each group rarest-first, so the most impressive shared
  // achievement leads.
  const rank = (r) => {
    const myUnk = r.mineUnknown,
      thUnk = r.theirsUnknown;
    const m = myUnk ? null : r.mine;
    const t = thUnk ? null : r.theirs;
    if (m && t) return 0;
    if (m && !t) return 1;
    if (!m && t) return 2;
    return 3;
  };
  rows.sort((a, b) => {
    const ra = rank(a),
      rb = rank(b);
    if (ra !== rb) return ra - rb;
    const ap = a.globalPercent ?? 101;
    const bp = b.globalPercent ?? 101;
    return ap - bp;
  });

  return { summary, rows, noAchievements: false };
}
