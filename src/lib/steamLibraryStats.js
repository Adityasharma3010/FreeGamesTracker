// Numbers for the Library stats panel. Pure function over the library
// array that's already loaded (playtime is in MINUTES, all-time) — no
// requests, so it can't add any Steam rate-limit pressure.

// Upper bound is exclusive, in minutes. "Never played" is its own bucket
// because Steam reports 0 minutes for it.
export const PLAYTIME_BUCKETS = [
  { key: "never", label: "Never played", min: 0, max: 1 },
  { key: "tiny", label: "Under 2h", min: 1, max: 120 },
  { key: "short", label: "2 – 10h", min: 120, max: 600 },
  { key: "medium", label: "10 – 50h", min: 600, max: 3000 },
  { key: "long", label: "50 – 100h", min: 3000, max: 6000 },
  { key: "huge", label: "100h+", min: 6000, max: Infinity },
];

const mins = (g) => Math.max(0, Number(g?.playtime) || 0);

export function computeLibraryStats(games = [], { topCount = 10 } = {}) {
  const total = games.length;
  let totalMinutes = 0;
  let played = 0;
  const counts = PLAYTIME_BUCKETS.map(() => 0);

  for (const g of games) {
    const m = mins(g);
    totalMinutes += m;
    if (m > 0) played++;
    const i = PLAYTIME_BUCKETS.findIndex((b) => m >= b.min && m < b.max);
    if (i >= 0) counts[i]++;
  }

  const top = games
    .filter((g) => mins(g) > 0)
    .sort(
      (a, b) =>
        mins(b) - mins(a) || String(a.name).localeCompare(String(b.name)),
    )
    .slice(0, topCount)
    .map((g) => ({ appid: g.appid, name: g.name, playtime: mins(g) }));

  const topMinutes = top.reduce((sum, g) => sum + g.playtime, 0);
  const never = total - played;

  return {
    total,
    played,
    never,
    neverPct: total ? Math.round((never / total) * 100) : 0,
    totalMinutes,
    totalHours: totalMinutes / 60,
    totalDays: totalMinutes / 60 / 24,
    avgMinutesPlayed: played ? totalMinutes / played : 0,
    buckets: PLAYTIME_BUCKETS.map((b, i) => ({
      key: b.key,
      label: b.label,
      count: counts[i],
    })),
    top,
    topSharePct: totalMinutes
      ? Math.round((topMinutes / totalMinutes) * 100)
      : 0,
  };
}
