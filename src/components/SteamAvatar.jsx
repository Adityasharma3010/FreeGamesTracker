import React from "react";
import { SiSteam } from "react-icons/si";

// How far (as % of the avatar's size) the frame extends past each edge.
// Tweak this one number if frames look too tight/loose vs the real thing.
const FRAME_OVERHANG = 8;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Plays Steam's animated version (webm/mp4) when the item has one, and
// otherwise shows the static image. Reduced-motion users always get the
// static image.
function Media({ image, video, className, style }) {
  const reduce = prefersReducedMotion();
  // An animated avatar's `image` is a GIF — swap in the still for reduced-motion users.
  if (reduce && video?.staticImage) image = video.staticImage;
  const hasVideo = video && (video.webm || video.mp4) && !reduce;
  if (hasVideo) {
    return (
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={image || undefined}
        className={className}
        style={style}
        aria-hidden="true"
      >
        {video.webm && <source src={video.webm} type="video/webm" />}
        {video.mp4 && <source src={video.mp4} type="video/mp4" />}
      </video>
    );
  }
  if (!image) return null;
  return (
    <img
      src={image}
      alt=""
      aria-hidden="true"
      className={className}
      style={style}
    />
  );
}

// src         = static avatar image (fallback / poster)
// video       = animated avatar item {image, webm, mp4} or null
// frame       = static frame image URL
// frameVideo  = animated frame item {image, webm, mp4} or null
export default function SteamAvatar({
  src,
  video,
  frame,
  frameVideo,
  size = 40,
  rounded = "rounded-sm",
  className = "",
}) {
  const hasFrame = !!(frame || frameVideo?.webm || frameVideo?.mp4);
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {src || video?.image || video?.webm || video?.mp4 ? (
        <Media
          image={video?.image || src}
          video={video}
          className={`w-full h-full object-cover ${rounded}`}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center ${rounded}`}
          style={{ background: "rgba(127,127,127,0.2)" }}
        >
          <SiSteam size={size * 0.45} />
        </div>
      )}
      {hasFrame && (
        <Media
          image={frame || frameVideo?.image}
          video={frameVideo}
          className="absolute max-w-none pointer-events-none"
          style={{
            top: `-${FRAME_OVERHANG}%`,
            left: `-${FRAME_OVERHANG}%`,
            width: `${100 + FRAME_OVERHANG * 2}%`,
            height: `${100 + FRAME_OVERHANG * 2}%`,
          }}
        />
      )}
    </div>
  );
}
