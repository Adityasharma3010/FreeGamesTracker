// Draws the downloadable Compare card (1080 x 1350 PNG) on a <canvas>.
// Everything is drawn by hand — no extra libraries. Images (avatars, game
// art) come through /api/steam-card-image so the canvas stays exportable;
// if one fails to load, the card still renders with a plain placeholder.

import { computeLibraryStats } from "./steamLibraryStats.js";
import { formatHours } from "./steamCompare.js";
import { computeMatchScore, matchLabel } from "./steamCompareInsights.js";

const W = 1080;
const H = 1350;
const BLUE = "#2fb4ff";
const PINK = "#e879f9";

const proxied = (url) => `/api/steam-card-image?url=${encodeURIComponent(url)}`;

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 9000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

async function loadSteamImage(url) {
  return url ? loadImage(proxied(url)) : null;
}

// Game art: ask the same resolver the site uses, then try each URL.
async function loadGameArt(appid) {
  let urls = [];
  try {
    const res = await fetch(`/api/steam-image?appids=${appid}`);
    if (res.ok) {
      const body = await res.json();
      urls = body?.results?.[appid]?.urls || [];
    }
  } catch {
    // fall through to the classic header URL below
  }
  urls = [
    ...urls,
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`,
    `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
  ];
  for (const url of urls.slice(0, 5)) {
    const img = await loadSteamImage(url);
    if (img) return img;
  }
  return null;
}

function fit(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t.trimEnd() + "…";
}

function spaced(ctx, value) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = value;
}

// "cover" a rectangle with an image (centered crop).
function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(
    img,
    (img.width - sw) / 2,
    (img.height - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
}

// Cheap, works-everywhere blur: shrink the image, then stretch it back up.
function drawBlurred(ctx, img, x, y, w, h) {
  const small = document.createElement("canvas");
  small.width = 36;
  small.height = Math.max(8, Math.round((36 * h) / w));
  const sctx = small.getContext("2d");
  sctx.imageSmoothingQuality = "high";
  drawCover(sctx, img, 0, 0, small.width, small.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, x, y, w, h);
}

function drawAvatar(ctx, img, player, cx, cy, size, color, family) {
  const x = cx - size / 2;
  const y = cy - size / 2;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 44;
  ctx.fillStyle = color;
  ctx.fillRect(x - 6, y - 6, size + 12, size + 12);
  ctx.restore();
  if (img) {
    drawCover(ctx, img, x, y, size, size);
  } else {
    ctx.fillStyle = "#1b2030";
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "#fff";
    ctx.font = `900 ${size * 0.45}px ${family}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((player.name || "?").slice(0, 1).toUpperCase(), cx, cy + 4);
  }
  if (typeof player.level === "number") {
    const bx = x + size;
    const by = y + size;
    ctx.beginPath();
    ctx.arc(bx, by, 27, 0, Math.PI * 2);
    ctx.fillStyle = "#0b0e16";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = `900 26px ${family}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(player.level), bx, by + 1);
  }
}

function drawVsRow(ctx, y, row, family) {
  const left = 160;
  const right = 920;
  const total = row.l + row.r;
  const lf = total > 0 ? row.l / total : 0.5;
  const leftWins = row.lowerWins ? row.l < row.r : row.l > row.r;
  const rightWins = row.lowerWins ? row.r < row.l : row.r > row.l;

  ctx.textBaseline = "alphabetic";
  ctx.font = `900 38px ${family}`;
  ctx.textAlign = "left";
  ctx.fillStyle = leftWins ? BLUE : "rgba(255,255,255,0.75)";
  ctx.fillText(row.lText, left, y);
  ctx.textAlign = "right";
  ctx.fillStyle = rightWins ? PINK : "rgba(255,255,255,0.75)";
  ctx.fillText(row.rText, right, y);

  ctx.textAlign = "center";
  ctx.font = `800 17px ${family}`;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  spaced(ctx, "4px");
  ctx.fillText(row.label.toUpperCase(), 540, y - 4);
  spaced(ctx, "0px");

  const barY = y + 18;
  const barW = right - left;
  const gap = 5;
  const lw = Math.max(0, (barW - gap) * lf);
  ctx.fillStyle = BLUE;
  ctx.fillRect(left, barY, lw, 12);
  ctx.fillStyle = PINK;
  ctx.fillRect(left + lw + gap, barY, barW - gap - lw, 12);
}

export async function renderCompareCard({ me, them, both, spotlight, host }) {
  try {
    await document.fonts?.ready;
  } catch {
    /* ignore */
  }
  const family =
    getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";

  const [avatarA, avatarB, art] = await Promise.all([
    loadSteamImage(me.avatar),
    loadSteamImage(them.avatar),
    spotlight ? loadGameArt(spotlight.appid) : Promise.resolve(null),
  ]);

  const meStats = computeLibraryStats(me.library);
  const themStats = computeLibraryStats(them.library);
  const shared = both.length;
  const score = computeMatchScore({
    shared,
    myCount: me.library.length,
    theirCount: them.library.length,
  });

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // ---- background -------------------------------------------------------
  ctx.fillStyle = "#0a0d15";
  ctx.fillRect(0, 0, W, H);
  if (art) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    drawBlurred(ctx, art, -60, -60, W + 120, 1000);
    ctx.restore();
  }
  let g = ctx.createRadialGradient(0, 0, 0, 0, 0, 760);
  g.addColorStop(0, "rgba(47,180,255,0.36)");
  g.addColorStop(1, "rgba(47,180,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W, 0, 0, W, 0, 760);
  g.addColorStop(0, "rgba(232,121,249,0.36)");
  g.addColorStop(1, "rgba(232,121,249,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(10,13,21,0.1)");
  g.addColorStop(0.55, "rgba(10,13,21,0.8)");
  g.addColorStop(1, "rgba(10,13,21,0.96)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // ---- brand row --------------------------------------------------------
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `900 34px ${family}`;
  let bx = 64;
  for (const [text, color] of [
    ["FREE", "#fff"],
    ["GAMES", "#d946ef"],
    ["TRACKER", "#fff"],
  ]) {
    ctx.fillStyle = color;
    ctx.fillText(text, bx, 84);
    bx += ctx.measureText(text).width;
  }
  ctx.textAlign = "right";
  ctx.font = `800 18px ${family}`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  spaced(ctx, "4px");
  ctx.fillText("HEAD-TO-HEAD", W - 64, 82);
  spaced(ctx, "0px");

  // ---- players + match ring ----------------------------------------------
  drawAvatar(ctx, avatarA, me, 250, 330, 210, BLUE, family);
  drawAvatar(ctx, avatarB, them, 830, 330, 210, PINK, family);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `900 44px ${family}`;
  ctx.fillStyle = "#fff";
  ctx.fillText(fit(ctx, me.name, 410), 250, 556);
  ctx.fillText(fit(ctx, them.name, 410), 830, 556);
  ctx.fillStyle = BLUE;
  ctx.fillRect(250 - 30, 574, 60, 4);
  ctx.fillStyle = PINK;
  ctx.fillRect(830 - 30, 574, 60, 4);

  const rcx = 540;
  const rcy = 330;
  const rr = 100;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(rcx, rcy, rr, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(8,10,16,0.55)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();
  if (score != null) {
    const lg = ctx.createLinearGradient(rcx - rr, rcy - rr, rcx + rr, rcy + rr);
    lg.addColorStop(0, BLUE);
    lg.addColorStop(1, PINK);
    ctx.save();
    ctx.shadowColor = "rgba(232,121,249,0.55)";
    ctx.shadowBlur = 24;
    ctx.strokeStyle = lg;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(
      rcx,
      rcy,
      rr,
      -Math.PI / 2,
      -Math.PI / 2 + (Math.PI * 2 * score) / 100,
    );
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.font = `900 70px ${family}`;
    ctx.fillText(`${score}%`, rcx, rcy - 6);
    ctx.textBaseline = "alphabetic";
    ctx.font = `800 16px ${family}`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    spaced(ctx, "5px");
    ctx.fillText("MATCH", rcx, rcy + 40);
    spaced(ctx, "0px");

    ctx.font = `900 22px ${family}`;
    ctx.fillStyle = PINK;
    spaced(ctx, "3px");
    ctx.fillText(matchLabel(score).toUpperCase(), rcx, 478);
    spaced(ctx, "0px");
    ctx.font = `600 21px ${family}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(
      `${shared} game${shared === 1 ? "" : "s"} in common`,
      rcx,
      510,
    );
  }

  // ---- head-to-head rows -------------------------------------------------
  const num = (n) => Math.round(n).toLocaleString("en-US");
  const rows = [];
  if (typeof me.level === "number" && typeof them.level === "number") {
    rows.push({
      label: "Steam level",
      l: me.level,
      r: them.level,
      lText: String(me.level),
      rText: String(them.level),
    });
  }
  rows.push(
    {
      label: "Games",
      l: meStats.total,
      r: themStats.total,
      lText: num(meStats.total),
      rText: num(themStats.total),
    },
    {
      label: "Hours played",
      l: meStats.totalHours,
      r: themStats.totalHours,
      lText: `${num(meStats.totalHours)}h`,
      rText: `${num(themStats.totalHours)}h`,
    },
    {
      label: "Never played",
      l: meStats.neverPct,
      r: themStats.neverPct,
      lText: `${meStats.neverPct}%`,
      rText: `${themStats.neverPct}%`,
      lowerWins: true,
    },
  );
  let y = 668;
  for (const row of rows) {
    drawVsRow(ctx, y, row, family);
    y += 78;
  }

  // ---- top shared game ---------------------------------------------------
  if (spotlight) {
    const px = 64;
    const py = 960;
    const pw = W - 128;
    const ph = 250;
    const frame = ctx.createLinearGradient(px, 0, px + pw, 0);
    frame.addColorStop(0, BLUE);
    frame.addColorStop(1, PINK);
    ctx.save();
    ctx.shadowColor = "rgba(232,121,249,0.3)";
    ctx.shadowBlur = 40;
    ctx.fillStyle = frame;
    ctx.fillRect(px - 3, py - 3, pw + 6, ph + 6);
    ctx.restore();
    ctx.fillStyle = "#0b0e16";
    ctx.fillRect(px, py, pw, ph);
    if (art) drawCover(ctx, art, px, py, pw, ph);
    const fade = ctx.createLinearGradient(px, 0, px + pw, 0);
    fade.addColorStop(0, "rgba(8,10,16,0.95)");
    fade.addColorStop(0.55, "rgba(8,10,16,0.82)");
    fade.addColorStop(1, "rgba(8,10,16,0.25)");
    ctx.fillStyle = fade;
    ctx.fillRect(px, py, pw, ph);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `900 18px ${family}`;
    ctx.fillStyle = PINK;
    spaced(ctx, "4px");
    ctx.fillText("TOP SHARED GAME", px + 36, py + 50);
    spaced(ctx, "0px");
    ctx.font = `900 50px ${family}`;
    ctx.fillStyle = "#fff";
    ctx.fillText(fit(ctx, spotlight.name, pw - 120), px + 36, py + 108);
    ctx.font = `600 21px ${family}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(
      `${formatHours(spotlight.myPlaytime + spotlight.theirPlaytime)} played between you`,
      px + 36,
      py + 142,
    );

    const max = Math.max(spotlight.myPlaytime, spotlight.theirPlaytime, 1);
    [
      [me.name, spotlight.myPlaytime, BLUE, py + 182],
      [them.name, spotlight.theirPlaytime, PINK, py + 218],
    ].forEach(([name, minutes, color, by]) => {
      ctx.font = `700 19px ${family}`;
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.textAlign = "left";
      ctx.fillText(fit(ctx, name, 200), px + 36, by);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(px + 260, by - 13, 520, 12);
      ctx.fillStyle = color;
      ctx.fillRect(px + 260, by - 13, Math.max(4, (520 * minutes) / max), 12);
      ctx.fillStyle = "#fff";
      ctx.font = `900 19px ${family}`;
      ctx.textAlign = "right";
      ctx.fillText(formatHours(minutes), px + pw - 36, by);
    });
  }

  // ---- footer ------------------------------------------------------------
  const line = ctx.createLinearGradient(64, 0, W - 64, 0);
  line.addColorStop(0, BLUE);
  line.addColorStop(1, PINK);
  ctx.fillStyle = line;
  ctx.fillRect(64, 1252, W - 128, 3);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `800 26px ${family}`;
  ctx.fillStyle = "#fff";
  ctx.fillText("Compare your own Steam library", 64, 1305);
  ctx.textAlign = "right";
  ctx.font = `600 22px ${family}`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(host || "", W - 64, 1305);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Couldn't create image")),
      "image/png",
    ),
  );
}
