import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useTrialNews } from "../hooks/useTrialNews.js";
import PlatformIcon from "./PlatformIcon.jsx";
import { LuRadar } from "react-icons/lu";

function formatDate(pubDate) {
  if (!pubDate) return "";
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Deliberately NOT styled like GameCard — this data is a keyword-matched
// guess from publisher news, not a confirmed giveaway, and it should
// never be visually confusable with the verified grid above it.
export default function TrialNewsSection() {
  const { theme } = useTheme();
  const { items, status } = useTrialNews();

  if (status !== "success" || items.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 relative z-10">
      <div className="flex items-start gap-2.5 mb-4">
        <LuRadar size={18} style={{ color: theme.textFaint }} className="shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: theme.text }}>
            Spotted in publisher news
          </h2>
          <p className="text-[11.5px] font-medium" style={{ color: theme.textFaint }}>
            Auto-detected from official news feeds, not a confirmed giveaway — tap through and check the article before assuming it's live.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <a
            key={item.link}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              animationDelay: `${Math.min(i, 10) * 60}ms`,
              background: theme.surface,
              borderColor: theme.surfaceBorder,
            }}
            className="tap-target motion-safe:opacity-0 motion-safe:animate-card-in flex items-center gap-3 px-3.5 py-3 border transition-all duration-200 hover:scale-[1.01]"
          >
            <PlatformIcon platformKey={item.platform} size={18} style={{ color: theme.textDim }} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold leading-snug line-clamp-1" style={{ color: theme.text }}>
                {item.title}
              </p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: theme.textFaint }}>
                {item.source}
                {item.pubDate ? ` · ${formatDate(item.pubDate)}` : ""}
              </p>
            </div>
            <span className="text-[10.5px] font-black uppercase tracking-wide shrink-0" style={{ color: theme.textFaint }}>
              Read →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
