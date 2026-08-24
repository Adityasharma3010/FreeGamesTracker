// Platform brand identity + mapping to GamerPower's own platform strings.
// GamerPower's `platforms` field on each giveaway is a free-text, comma
// separated string (e.g. "PC, Steam, Epic Games Store"), so matching is
// done by substring rather than exact key lookup — see matchesPlatform().

export const PLATFORMS = {
  // PC used to share near-white with Epic, which read as "disabled" —
  // it's the most common tag on GamerPower so it needs its own strong
  // identity. Amber keeps it visually distinct from every store color.
  pc: { label: "PC", a: "#f5a524", d: "#3a2405", match: ["pc"] },
  steam: { label: "Steam", a: "#2fb4ff", d: "#0a2e4a", match: ["steam"] },
  // Epic's actual brand is black/white — kept true to that, but the
  // banner is now a gradient into its dark tone (see GameCard) instead
  // of a flat pale block, so it reads as "on-brand" rather than "muted."
  epic: { label: "Epic Games", a: "#e4e4e7", d: "#151517", match: ["epic games store", "epic games"] },
  gog: { label: "GOG", a: "#b366ff", d: "#2c1150", match: ["gog"] },
  ps4: { label: "PS4", a: "#2f8fff", d: "#06264f", match: ["ps4"] },
  ps5: { label: "PS5", a: "#2f8fff", d: "#06264f", match: ["ps5"] },
  xboxseries: { label: "Xbox Series X/S", a: "#4bdc3d", d: "#0c2b0a", match: ["xbox series"] },
  xboxone: { label: "Xbox One", a: "#4bdc3d", d: "#0c2b0a", match: ["xbox one"] },
  switch: { label: "Switch", a: "#ff4646", d: "#420c0c", match: ["switch"] },
  android: { label: "Android", a: "#8bd450", d: "#173308", match: ["android"] },
  ios: { label: "iOS", a: "#60a5fa", d: "#0f2440", match: ["ios"] },
  itchio: { label: "itch.io", a: "#fa5c5c", d: "#3d0f0f", match: ["itch.io", "itchio"] },
};

// Fallback identity for a platform giveaway string that doesn't match any
// key above (GamerPower occasionally adds new platform text) — keeps
// cards themed instead of breaking.
export const UNKNOWN_PLATFORM = { label: "Other", a: "#a78bfa", d: "#241a3d" };

export function matchesPlatform(giveawayPlatformsStr, platformKey) {
  if (platformKey === "all") return true;
  const def = PLATFORMS[platformKey];
  if (!def) return false;
  const hay = (giveawayPlatformsStr || "").toLowerCase();
  return def.match.some((m) => hay.includes(m));
}

// Picks the single best platform identity to theme a card with, since a
// giveaway can list several platforms (e.g. "PC, Steam"). Prefers the
// more specific store name over the generic "PC".
const PRIORITY = ["steam", "epic", "gog", "ps5", "ps4", "xboxseries", "xboxone", "switch", "android", "ios", "itchio", "pc"];

export function primaryPlatformFor(giveawayPlatformsStr) {
  const hay = (giveawayPlatformsStr || "").toLowerCase();
  for (const key of PRIORITY) {
    const def = PLATFORMS[key];
    if (def.match.some((m) => hay.includes(m))) return { key, ...def };
  }
  return { key: "other", ...UNKNOWN_PLATFORM };
}

export const TYPES = {
  game: { label: "Free to keep", chip: "KEEP FOREVER", match: (t) => /game/i.test(t) },
  loot: { label: "Loot / DLC", chip: "DLC / LOOT", match: (t) => /loot|dlc/i.test(t) },
  beta: { label: "Beta / Early access", chip: "BETA", match: (t) => /beta|early access/i.test(t) },
};

// Picks readable text color against a given accent hex, so light accents
// (Epic's near-white, PC's amber) get dark text instead of white-on-white.
export function isLight(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export function typeKeyFor(giveawayType) {
  const t = giveawayType || "";
  if (TYPES.loot.match(t)) return "loot";
  if (TYPES.beta.match(t)) return "beta";
  return "game";
}
