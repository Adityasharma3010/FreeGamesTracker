import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SiSteam } from "react-icons/si";
import SteamGameImage from "./SteamGameImage.jsx";
import ImageLightbox from "./ImageLightbox.jsx";
import {
  LuPlay,
  LuChevronLeft,
  LuChevronRight,
  LuX,
  LuMaximize2,
} from "react-icons/lu";

// Cached per appid for the session — revisiting a game you already opened
// (via back button, or clicking into it again from a list) shows it
// instantly instead of re-hitting our own endpoint and showing the
// loading skeleton again. 30 min TTL: long enough that normal browsing
// never re-fetches, short enough that a very long session still picks up
// new news/price changes eventually.
const DETAILS_CACHE_TTL_MS = 30 * 60 * 1000;
const detailsCache = new Map(); // appid -> { fetchedAt, data }

// Game detail page content: header art, description, and a proper media
// gallery — one big viewer + a thumbnail strip. Trailers are marked with
// a play badge; clicking a thumbnail switches the viewer; clicking a
// screenshot opens it full-size in a lightbox.
export default function GameDetailView({ game, theme, highlight, onBack }) {
  const [imgOk, setImgOk] = useState(true);
  const [details, setDetails] = useState(null); // null = loading
  const [active, setActive] = useState(0);
  const [failedVideos, setFailedVideos] = useState({}); // id -> true if a trailer couldn't play
  const [lightbox, setLightbox] = useState(null); // index into screenshots, or null
  const [openNews, setOpenNews] = useState(null); // the news item object, or null
  const [picked, setPicked] = useState(false); // true once the user has clicked a thumbnail/arrow — only then does a trailer autoplay
  const glow = highlight ? "#fbbf24" : "#2fb4ff";
  const storeUrl = `https://store.steampowered.com/app/${game.appid}`;

  useEffect(() => {
    let cancelled = false;
    const appid = game.appid;
    setActive(0);
    setPicked(false);
    setFailedVideos({});

    const cached = detailsCache.get(appid);
    if (cached && Date.now() - cached.fetchedAt < DETAILS_CACHE_TTL_MS) {
      setDetails(cached.data);
      return;
    }

    setDetails(null);
    fetch(`/api/steam-appdetails?appid=${appid}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        detailsCache.set(appid, { fetchedAt: Date.now(), data: d });
        setDetails(d);
      })
      .catch(() => {
        if (!cancelled) setDetails({ found: false });
      });
    return () => {
      cancelled = true;
    };
  }, [game.appid]);

  // Trailers first, then screenshots — same order as Steam's store page.
  const media = [];
  if (details?.found) {
    (details.movies || []).forEach((m) => {
      if (m.thumbnail || m.mp4 || m.webm)
        media.push({ type: "video", key: `v${m.id}`, ...m });
    });
    (details.screenshots || []).forEach((s, i) =>
      media.push({ type: "image", key: `s${i}`, shotIndex: i, ...s }),
    );
  }
  const screenshots = details?.found ? details.screenshots || [] : [];
  const current = media[active];

  const step = (dir) => {
    setPicked(true);
    setActive((i) => (i + dir + media.length) % media.length);
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="cursor-pointer flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide self-start transition-transform duration-150 hover:-translate-x-0.5"
        style={{ color: theme.textFaint }}
      >
        ← Back
      </button>

      <div
        className="relative w-full aspect-[460/215] overflow-hidden border"
        style={{
          background: theme.chipBg,
          borderColor: `${glow}55`,
          boxShadow: `0 0 20px ${glow}33`,
        }}
      >
        {imgOk ? (
          <SteamGameImage
            appid={game.appid}
            className="absolute inset-0 w-full h-full object-cover"
            onAllFailed={() => setImgOk(false)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <SiSteam size={32} style={{ color: theme.textFaint }} />
          </div>
        )}
        {highlight && (
          <span
            className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded flex items-center gap-1"
            style={{ background: "#fbbf24", color: "#151517" }}
          >
            <span className="w-1 h-1 rounded-full bg-[#151517] motion-safe:animate-pulse-dot" />
            Currently free
          </span>
        )}
      </div>

      <div>
        <h1
          className="text-xl font-black leading-snug"
          style={{ color: theme.text }}
        >
          {game.name}
        </h1>
        <p
          className="text-[11px] font-bold mt-1"
          style={{ color: theme.textFaint }}
        >
          App ID {game.appid}
        </p>
      </div>

      {(details?.reviews || typeof details?.playerCount === "number") && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {details.reviews && (
            <span
              className="text-[11.5px] font-bold"
              style={{
                color: details.reviews.description
                  .toLowerCase()
                  .includes("negative")
                  ? "#ff6161"
                  : details.reviews.description.toLowerCase().includes("mixed")
                    ? "#fbbf24"
                    : "#7dff70",
              }}
            >
              {details.reviews.description}
              {details.reviews.totalReviews > 0 && (
                <span style={{ color: theme.textFaint, fontWeight: 700 }}>
                  {" "}
                  · {details.reviews.percentPositive}% of{" "}
                  {details.reviews.totalReviews.toLocaleString()} reviews
                </span>
              )}
            </span>
          )}
          {typeof details.playerCount === "number" && (
            <span
              className="text-[11.5px] font-bold flex items-center gap-1.5"
              style={{ color: theme.textFaint }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#7dff70" }}
              />
              {details.playerCount.toLocaleString()} playing now
            </span>
          )}
        </div>
      )}

      {details === null && (
        <div
          className="flex flex-col gap-3"
          aria-label="Loading game details"
          role="status"
        >
          {/* Mirrors the loaded layout's actual proportions (genre chips,
              a few description lines, then the gallery viewer + thumbnail
              strip) so the page doesn't look "too small to notice" while
              it's still loading. */}
          <div className="flex gap-1.5">
            {[52, 68, 44].map((w, i) => (
              <div
                key={i}
                className="h-5 rounded motion-safe:animate-pulse"
                style={{ width: w, background: theme.chipBg }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div
              className="h-3.5 rounded-full motion-safe:animate-pulse"
              style={{ background: theme.chipBg, width: "95%" }}
            />
            <div
              className="h-3.5 rounded-full motion-safe:animate-pulse"
              style={{ background: theme.chipBg, width: "88%" }}
            />
            <div
              className="h-3.5 rounded-full motion-safe:animate-pulse"
              style={{ background: theme.chipBg, width: "60%" }}
            />
          </div>
          <div
            className="w-full aspect-video motion-safe:animate-pulse"
            style={{ background: theme.chipBg }}
          />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 aspect-video shrink-0 motion-safe:animate-pulse"
                style={{ background: theme.chipBg }}
              />
            ))}
          </div>
        </div>
      )}

      {details && !details.found && (
        <p className="text-[12.5px]" style={{ color: theme.textDim }}>
          Steam has no store details for this one (it may be delisted,
          region-locked or a tool/demo).
        </p>
      )}

      {details?.found && details.genres?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {details.genres.map((g) => (
            <span
              key={g}
              className="text-[9.5px] font-black uppercase tracking-wide px-2 py-1 rounded"
              style={{ background: theme.chipBg, color: theme.textFaint }}
            >
              {g}
            </span>
          ))}
        </div>
      )}

      {details?.found && details.description && (
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: theme.textDim }}
        >
          {details.description}
        </p>
      )}

      {details?.found && details.dlc?.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2
            className="text-[11px] font-black uppercase tracking-wide"
            style={{ color: theme.textFaint }}
          >
            DLC & extras
          </h2>
          <div className="flex flex-col gap-1.5">
            {details.dlc.map((item) => (
              <a
                key={item.appid}
                href={`https://store.steampowered.com/app/${item.appid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2 border transition-colors duration-150 hover:brightness-110"
                style={{
                  borderColor: theme.surfaceBorder,
                  background: theme.chipBg,
                }}
              >
                <span
                  className="text-[12px] font-bold leading-snug"
                  style={{ color: theme.text }}
                >
                  {item.name}
                </span>
                <span
                  className="text-[11px] font-black shrink-0"
                  style={{ color: item.free ? "#7dff70" : theme.textFaint }}
                >
                  {item.free
                    ? "Free"
                    : item.priceFinal != null
                      ? item.discountPercent > 0
                        ? `-${item.discountPercent}% · ${item.currency} ${item.priceFinal.toFixed(2)}`
                        : `${item.currency} ${item.priceFinal.toFixed(2)}`
                      : "—"}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ---------- Media gallery ---------- */}
      {current && (
        <div className="flex flex-col gap-2">
          <div
            className="relative w-full aspect-video overflow-hidden border group"
            style={{ background: "#000", borderColor: theme.surfaceBorder }}
          >
            {current.type === "video" ? (
              failedVideos[current.id] ||
              (!current.mp4 && !current.webm && !current.hls) ? (
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4"
                >
                  {current.thumbnail && (
                    <img
                      src={current.thumbnail}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-40"
                    />
                  )}
                  <span className="relative text-[13px] font-black text-white">
                    This trailer can't play here
                  </span>
                  <span
                    className="relative text-[11px] font-bold px-3 py-1.5 rounded-sm"
                    style={{ background: glow, color: "#051622" }}
                  >
                    Watch on Steam ↗
                  </span>
                </a>
              ) : (
                <TrailerPlayer
                  key={current.key}
                  movie={current}
                  autoPlay={picked}
                  onFail={() =>
                    setFailedVideos((f) => ({ ...f, [current.id]: true }))
                  }
                />
              )
            ) : (
              <button
                type="button"
                onClick={() => setLightbox(current.shotIndex)}
                aria-label="View screenshot full size"
                className="absolute inset-0 w-full h-full cursor-zoom-in"
              >
                <img
                  src={current.full || current.thumb}
                  alt=""
                  className="w-full h-full object-contain"
                />
                <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <LuMaximize2 size={11} /> Full size
                </span>
              </button>
            )}

            {media.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80"
                >
                  <LuChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80"
                >
                  <LuChevronRight size={18} />
                </button>
              </>
            )}
            <span className="absolute bottom-2 left-2 text-[10px] font-black px-2 py-0.5 rounded bg-black/60 text-white pointer-events-none">
              {current.type === "video" ? "TRAILER" : "SCREENSHOT"} ·{" "}
              {active + 1} / {media.length}
            </span>
          </div>

          {/* Thumbnail strip — trailers get a play badge so they're obvious */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {media.map((m, i) => (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  setPicked(true);
                  setActive(i);
                }}
                aria-label={
                  m.type === "video"
                    ? `Trailer ${m.name || ""}`
                    : `Screenshot ${m.shotIndex + 1}`
                }
                className="relative shrink-0 h-16 aspect-video overflow-hidden border-2 cursor-pointer transition-all duration-150 hover:scale-[1.04]"
                style={{
                  borderColor: i === active ? glow : "transparent",
                  boxShadow: i === active ? `0 0 10px ${glow}88` : "none",
                  opacity: i === active ? 1 : 0.75,
                }}
              >
                <img
                  src={m.type === "video" ? m.thumbnail : m.thumb}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                {m.type === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: glow, color: "#051622" }}
                    >
                      <LuPlay size={12} fill="currentColor" />
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {details?.news?.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h2
            className="text-[11px] font-black uppercase tracking-wide"
            style={{ color: theme.textFaint }}
          >
            Recent news
          </h2>
          {details.news.map((n) => (
            <button
              key={n.gid}
              type="button"
              onClick={() => setOpenNews(n)}
              className="text-left block w-full border px-3 py-2.5 cursor-pointer transition-colors duration-150 hover:brightness-110"
              style={{
                borderColor: theme.surfaceBorder,
                background: theme.chipBg,
              }}
            >
              <p
                className="text-[12.5px] font-bold leading-snug"
                style={{ color: theme.text }}
              >
                {n.title}
              </p>
              <p
                className="text-[10px] font-bold mt-1"
                style={{ color: theme.textFaint }}
              >
                {n.author ? `${n.author} · ` : ""}
                {n.date ? new Date(n.date * 1000).toLocaleDateString() : ""}
              </p>
              {n.excerpt && (
                <p
                  className="text-[11.5px] mt-1.5 leading-relaxed line-clamp-2"
                  style={{ color: theme.textDim }}
                >
                  {n.excerpt}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      <a
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="tap-target relative flex items-center justify-center gap-2 text-[13px] font-black px-3 py-3 rounded-sm uppercase tracking-wide overflow-hidden group/btn transition-transform duration-150 hover:scale-[1.02] active:scale-95"
        style={{ background: glow, color: "#051622" }}
      >
        <SiSteam size={16} className="relative z-10" />
        <span className="relative z-10">Open on Steam ↗</span>
        <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.5),transparent)]" />
      </a>

      {lightbox !== null && (
        <ImageLightbox
          images={screenshots.map((s) => s.full || s.thumb)}
          index={lightbox}
          setIndex={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
      {openNews && (
        <NewsModal
          news={openNews}
          theme={theme}
          onClose={() => setOpenNews(null)}
        />
      )}
    </div>
  );
}

// Full article, read in place — the click used to send people out to the
// Steam Community page; now it only does that if THEY choose "View on
// Steam" from inside here.
// A news image, with a shimmering placeholder shown until it actually
// finishes loading — without this the space just sits empty/blank while
// slow-loading Steam CDN images come in, which reads as broken rather
// than "still loading".
// Both media blocks below sit on their own pure-black background
// REGARDLESS of the site's light/dark toggle (this is inside the Steam
// panel, which is always forced dark). theme.chipBg used to be the
// skeleton's color — a ~4%-opacity white tint meant to show up against
// a normal page background. On pure black it was practically invisible:
// there WAS a skeleton, it just couldn't be seen against black, which
// reads identically to "no skeleton at all". Both now use a fixed
// shimmer that's visible on black regardless of theme, with a diagonal
// sweep animation so it reads as "actively loading" rather than a flat
// box.
const shimmerStyle = {
  background:
    "linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.14) 37%, rgba(255,255,255,0.05) 63%)",
  backgroundSize: "200% 100%",
  animation: "newsShimmer 1.3s ease-in-out infinite",
};

function NewsImageBlock({ src, onOpen }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block w-full cursor-zoom-in overflow-hidden"
      style={{ aspectRatio: loaded ? undefined : "16 / 9", background: "#000" }}
      aria-label="View image full size"
    >
      <style>{`@keyframes newsShimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      {!loaded && (
        <div
          className="absolute inset-0 z-10"
          style={shimmerStyle}
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt=""
        loading="lazy"
        className="relative w-full h-auto block transition-opacity duration-200"
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </button>
  );
}

// Same idea for an embedded YouTube player. The bug here was different:
// the skeleton and the iframe were both position:absolute with no
// z-index, so the iframe — added after it in the DOM — simply stacked
// ON TOP of the skeleton and hid it completely the moment the <iframe>
// element existed, regardless of whether it had actually loaded
// anything yet. z-10 on the skeleton fixes the stacking, not just the
// loading logic.
function NewsYoutubeBlock({ id }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className="relative w-full aspect-video"
      style={{ background: "#000" }}
    >
      <style>{`@keyframes newsShimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      {!loaded && (
        <div
          className="absolute inset-0 z-10"
          style={shimmerStyle}
          aria-hidden="true"
        />
      )}
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 w-full h-full border-0"
      />
    </div>
  );
}

function NewsModal({ news, theme, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);

    // Lock the page behind the modal instead of letting both scroll —
    // preserves scroll position on close instead of jumping to the top.
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      width: style.width,
    };
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";

    return () => {
      document.removeEventListener("keydown", onKey);
      style.position = prev.position;
      style.top = prev.top;
      style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [onClose]);

  const blocks =
    news.blocks?.length > 0
      ? news.blocks
      : news.excerpt
        ? [{ type: "text", value: news.excerpt }]
        : [];
  const imageUrls = blocks.filter((b) => b.type === "image").map((b) => b.src);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-xl max-h-[88vh] my-6 sm:my-0 border shadow-2xl"
        style={{ background: theme.pageBg, borderColor: theme.surfaceBorder }}
      >
        {/* Header stays put; only the body below scrolls */}
        <div
          className="flex items-start justify-between gap-3 px-5 py-4 border-b shrink-0"
          style={{
            borderColor: theme.surfaceBorder,
            background: theme.surface,
          }}
        >
          <div className="min-w-0">
            <h3
              className="text-[16px] font-black leading-snug"
              style={{ color: theme.text }}
            >
              {news.title}
            </h3>
            <p
              className="text-[11px] font-bold mt-1"
              style={{ color: theme.textFaint }}
            >
              {news.author ? `${news.author} · ` : ""}
              {news.date
                ? new Date(news.date * 1000).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10"
            style={{ color: theme.textFaint }}
          >
            <LuX size={19} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex flex-col gap-3.5">
          {blocks.length === 0 ? (
            <p className="text-[13px]" style={{ color: theme.textFaint }}>
              No content available.
            </p>
          ) : (
            blocks.map((b, i) => {
              if (b.type === "image") {
                if (!b.src) return null;
                const imgIndex = imageUrls.indexOf(b.src);
                return (
                  <NewsImageBlock
                    key={i}
                    src={b.src}
                    onOpen={() => setLightboxIndex(imgIndex)}
                  />
                );
              }
              if (b.type === "youtube") {
                return <NewsYoutubeBlock key={i} id={b.id} />;
              }
              if (b.type === "link") {
                return (
                  <a
                    key={i}
                    href={b.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-bold break-words transition-opacity hover:opacity-70"
                    style={{ color: "#2fb4ff" }}
                  >
                    {b.label} ↗
                  </a>
                );
              }
              return (
                <p
                  key={i}
                  className="text-[13.5px] leading-relaxed"
                  style={{ color: theme.textDim }}
                >
                  {b.value}
                </p>
              );
            })
          )}
        </div>

        {lightboxIndex !== null && (
          <ImageLightbox
            images={imageUrls}
            index={lightboxIndex}
            setIndex={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}

        {news.url && (
          <div
            className="px-5 py-3.5 border-t shrink-0"
            style={{
              borderColor: theme.surfaceBorder,
              background: theme.surface,
            }}
          >
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11.5px] font-bold transition-opacity hover:opacity-70"
              style={{ color: "#2fb4ff" }}
            >
              View original on Steam ↗
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Plays a Steam trailer inside the page. Tries the plain webm/mp4 files
// first; if those are missing or fail, falls back to Steam's HLS stream
// (Steam has been moving trailers to HLS). Safari plays HLS natively;
// every other browser uses hls.js, loaded only when it's actually needed
// so it doesn't add to the normal page weight. Only if ALL of that fails
// does the parent show the "Watch on Steam" link.
function TrailerPlayer({ movie, autoPlay, onFail }) {
  const videoRef = useRef(null);
  const files = [movie.webm, movie.mp4].filter(Boolean);
  const [fileIndex, setFileIndex] = useState(0);
  const useHls = fileIndex >= files.length && !!movie.hls;

  useEffect(() => {
    if (fileIndex >= files.length && !movie.hls) onFail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileIndex]);

  useEffect(() => {
    if (!useHls) return;
    const video = videoRef.current;
    if (!video) return;
    let hls;
    let cancelled = false;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = movie.hls; // Safari / iOS
      if (autoPlay) video.play().catch(() => {});
    } else {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (!Hls.isSupported()) return onFail();
          hls = new Hls();
          hls.loadSource(movie.hls);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (autoPlay) video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) onFail();
          });
        })
        .catch(() => !cancelled && onFail());
    }
    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useHls, movie.hls]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      autoPlay={autoPlay}
      poster={movie.thumbnail || undefined}
      src={!useHls ? files[fileIndex] : undefined}
      onError={() => {
        if (!useHls) setFileIndex((i) => i + 1);
      }}
      className="absolute inset-0 w-full h-full bg-black"
    />
  );
}
