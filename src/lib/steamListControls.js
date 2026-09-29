// Search / sort / filter for the Steam Wishlist and Library grids.
// Shared by the own-profile page and the friend page so the two can't
// drift apart. Everything here is plain functions over the game arrays
// that are already loaded — no extra requests.
//
// Sort options mirror the ones Steam itself offers where the data exists:
//   Wishlist (Steam's own): Ranked Order, Name, Date Added
//   Library:                Name, Playtime, Last played
// Steam's other wishlist sorts (Price, Discount, Release Date, Review
// Score) and filters (Early Access, Pre-release, VR, Deck, platform) need
// per-game store data that isn't part of the wishlist/library responses,
// so they aren't offered here.

export const LIBRARY_SORTS = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "playtime-desc", label: "Most played" },
  { value: "playtime-asc", label: "Least played" },
  { value: "last-played", label: "Last played", needs: "lastPlayed" },
];

export const WISHLIST_SORTS = [
  { value: "rank", label: "Ranked order" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "added-desc", label: "Date added (newest)", needs: "dateAdded" },
  { value: "added-asc", label: "Date added (oldest)", needs: "dateAdded" },
];

export const DEFAULT_SORT = { library: "name-asc", wishlist: "rank" };

// Lowercased, accent-free, with ™/®/© stripped — so "batman arkham" finds
// "Batman™: Arkham Knight" and "pokemon" finds "Pokémon".
export function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[™®©]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// A sort that depends on a field (e.g. lastPlayed) is only offered when
// at least one game actually has it — so if Steam ever stops sending it,
// the option quietly disappears instead of sorting everything as "0".
export function availableSorts(kind, games) {
  const all = kind === "wishlist" ? WISHLIST_SORTS : LIBRARY_SORTS;
  return all.filter(
    (s) => !s.needs || games.some((g) => Number(g[s.needs]) > 0),
  );
}

// Filters are single-choice ("All" plus one). Only offered when they'd
// actually change something.
export function availableFilters({ kind, hasOwnedInfo, matchAppIds }) {
  const list = [{ key: "all", label: "All" }];
  if (kind === "library") {
    list.push({ key: "played", label: "Played" });
    list.push({ key: "unplayed", label: "Never played" });
  } else {
    if (matchAppIds && matchAppIds.size > 0) {
      list.push({ key: "free", label: "Free now" });
    }
    if (hasOwnedInfo) {
      list.push({ key: "unowned", label: "Not owned yet" });
      list.push({ key: "owned", label: "Already owned" });
    }
  }
  return list;
}

function compareName(a, b) {
  return normalize(a.name).localeCompare(normalize(b.name), undefined, {
    numeric: true,
  });
}

// `index` (original position) is the tiebreaker everywhere, so equal
// items keep Steam's own order instead of shuffling.
const COMPARATORS = {
  rank: () => 0,
  "name-asc": (a, b) => compareName(a.g, b.g),
  "name-desc": (a, b) => compareName(b.g, a.g),
  "playtime-desc": (a, b) => (b.g.playtime || 0) - (a.g.playtime || 0),
  "playtime-asc": (a, b) => (a.g.playtime || 0) - (b.g.playtime || 0),
  // Never played / no date (0) always sinks to the bottom, whichever
  // direction — a missing value isn't "oldest".
  "last-played": (a, b) => (b.g.lastPlayed || 0) - (a.g.lastPlayed || 0),
  "added-desc": (a, b) => (b.g.dateAdded || 0) - (a.g.dateAdded || 0),
  "added-asc": (a, b) => {
    const x = a.g.dateAdded || 0;
    const y = b.g.dateAdded || 0;
    if (!x && !y) return 0;
    if (!x) return 1;
    if (!y) return -1;
    return x - y;
  },
};

export function applyControls(
  games,
  { search, sort, filter, libraryAppids, matchAppIds },
) {
  const tokens = normalize(search).split(" ").filter(Boolean);
  let list = games.map((g, index) => ({ g, index }));

  if (tokens.length) {
    list = list.filter(({ g }) => {
      const name = normalize(g.name);
      return tokens.every((t) => name.includes(t));
    });
  }

  if (filter === "played") list = list.filter(({ g }) => (g.playtime || 0) > 0);
  else if (filter === "unplayed")
    list = list.filter(({ g }) => !(g.playtime || 0));
  else if (filter === "free")
    list = list.filter(({ g }) => matchAppIds?.has(g.appid));
  else if (filter === "owned")
    list = list.filter(({ g }) => libraryAppids?.has(g.appid));
  else if (filter === "unowned")
    list = list.filter(({ g }) => !libraryAppids?.has(g.appid));

  const compare = COMPARATORS[sort] || COMPARATORS.rank;
  list.sort((a, b) => compare(a, b) || a.index - b.index);

  return list.map(({ g }) => g);
}