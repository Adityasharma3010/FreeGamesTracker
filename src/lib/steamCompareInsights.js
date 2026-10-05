// Extra numbers for the Compare header. Pure functions over data the
// Compare page already has — no requests.

// "Match" = shared games ÷ the SMALLER of the two libraries, so a small
// library that's mostly covered by a big one still scores high. Returns
// null when a library is empty (nothing to compare).
export function computeMatchScore({ shared, myCount, theirCount }) {
  const smaller = Math.min(myCount, theirCount);
  if (!smaller) return null;
  return Math.min(100, Math.round((shared / smaller) * 100));
}

export function matchLabel(score) {
  if (score == null) return "";
  if (score < 15) return "Different tastes";
  if (score < 35) return "Some overlap";
  if (score < 60) return "Good match";
  return "Gaming twins";
}

// `both` is compareLibraries().both:
//   [{ appid, name, myPlaytime, theirPlaytime }]  (minutes)
export function computeHighlights(both = []) {
  if (!both.length) return null;
  const total = (g) => g.myPlaytime + g.theirPlaytime;
  const gap = (g) => Math.abs(g.myPlaytime - g.theirPlaytime);

  const mostTogether = both.reduce((b, g) => (total(g) > total(b) ? g : b));
  const biggestGap = both.reduce((b, g) => (gap(g) > gap(b) ? g : b));

  return {
    // Only worth showing when there's something to show.
    mostTogether: total(mostTogether) > 0 ? mostTogether : null,
    biggestGap: gap(biggestGap) >= 60 ? biggestGap : null, // 1h+ difference
    neitherPlayed: both.filter((g) => total(g) === 0).length,
  };
}