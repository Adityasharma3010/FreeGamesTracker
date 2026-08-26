import { XMLParser } from "fast-xml-parser";

// Runs server-side on Vercel — this is what solves the CORS problem.
// Publisher RSS feeds don't allow direct browser fetches, but a
// serverless function fetching them is just a normal server-to-server
// request, no CORS involved.

const FEEDS = [
  { source: "Xbox Wire", url: "https://news.xbox.com/en-us/feed/", platform: "xboxseries" },
  { source: "PlayStation Blog", url: "https://blog.playstation.com/feed/", platform: "ps5" },
  { source: "Ubisoft News", url: "https://news.ubisoft.com/en-gb/rss", platform: "pc" },
];

// Deliberately narrow phrases — this is a heuristic keyword match on
// article titles/summaries, not a structured data source. Narrow and
// literal on purpose: better to miss an article than to wrongly flag one
// as a free trial when it isn't. See README for the honesty tradeoffs.
const TRIAL_PATTERNS = [
  /free\s*play\s*days?/i,
  /free\s*weekend/i,
  /free\s*trial/i,
  /play\s*(for\s*)?free\s+(this|starting|now|today)/i,
  /play\s*.{0,20}\s*free\s*this\s*week/i,
  /open\s*(beta|trial)\s*(weekend)?/i,
];

// Excludes titles that mention "free" in an unrelated sense, to cut
// down obvious false positives (subscription pricing, unrelated DLC).
const EXCLUDE_PATTERNS = [/free-to-play\s*(launch|update)?$/i];

function stripHtml(str = "") {
  return str.replace(/<[^>]*>/g, "").trim();
}

function matchesTrial(title, summary) {
  const text = `${title} ${summary}`;
  if (EXCLUDE_PATTERNS.some((p) => p.test(text))) return false;
  return TRIAL_PATTERNS.some((p) => p.test(text));
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "FreeGamesTrackerBot/1.0 (+https://github.com/Adityasharma3010/FreeGamesTracker)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item || [];
    const list = Array.isArray(items) ? items : [items];

    return list
      .map((item) => {
        const title = stripHtml(item.title || "");
        const summary = stripHtml(item.description || item["content:encoded"] || "");
        return {
          title,
          summary: summary.slice(0, 220),
          link: item.link,
          pubDate: item.pubDate || item.published || null,
          source: feed.source,
          platform: feed.platform,
        };
      })
      .filter((item) => item.title && item.link && matchesTrial(item.title, item.summary));
  } catch {
    return []; // one feed failing shouldn't break the others
  }
}

export default async function handler(req, res) {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const flat = results.flat().sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));

  // Cache at the edge for 30 min — publisher news doesn't move fast
  // enough to need fresher polling, and it's kinder to their feeds.
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
  res.status(200).json({ items: flat.slice(0, 20) });
}
