# 🎮 Free Games Tracker — React + Vite PWA

A gaming web app that tracks free game giveaways across PC and console stores, and connects to your Steam account to show your wishlist, library, profile, and friend comparisons.

Free giveaway data comes live from the [GamerPower API](https://www.gamerpower.com/api-read) (no key needed). Steam features run through small Vercel serverless functions so your Steam API key never reaches the browser.

[![React](https://img.shields.io/badge/Frontend-React%2018-blue)](#)
[![Vite](https://img.shields.io/badge/Build-Vite-purple)](#)
[![Tailwind](https://img.shields.io/badge/Styling-Tailwind%20CSS%204-38bdf8)](#)
[![Vercel](https://img.shields.io/badge/Hosting-Vercel-black)](#)
[![PWA](https://img.shields.io/badge/PWA-Installable-orange)](#)
[![Status](https://img.shields.io/badge/Status-Production-success)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](#)

---

## 🚀 Live Demo

[https://free-games-tracker-black.vercel.app](https://free-games-tracker-black.vercel.app)

---

## ✨ Features

### Free games

- 🆓 Live free-game and DLC giveaways from GamerPower
- 🎛️ Filter by platform and giveaway type, with sorting
- ⭐ Favorites / watchlist with a badge counter
- 📰 "Spotted in publisher news" — scans Xbox Wire, PlayStation Blog, and Ubisoft News RSS feeds for free-trial / free-weekend announcements
- ⚡ 10-minute client-side cache to keep API calls low
- 🌙 Dark / light theme with per-platform accent colors
- 📲 Installable PWA with a network-first service worker

### Steam integration

- 🔑 Sign in with Steam (OpenID, verified server-side) or enter a Steam ID
- 💝 Wishlist and 📚 Library pages with search, sort, and filters
- 🎲 "Pick a game" — random pick that favors games you've never played
- 📊 Library stats
- 👤 Profile page with friends showcase
- 🕹️ Game detail pages — screenshots, trailers (HLS with quality menu), reviews, achievements
- 🏆 Achievement lists with rarity, plus a side-by-side achievement compare
- 🤝 Compare with a friend — games you both own, wishlist overlaps, and a match score
- 👥 Group compare — pick 3–6 players with the multi-select friend picker and compare them on one page (`/steam/group/:ids`)
- 🔗 Shareable public links for one-on-one (`/steam/compare/:a/:b`) and group compares
- 🖼️ Downloadable share card image (portrait or wide)
- 🎯 Matches — cross-references current giveaways with your Steam wishlist and library

> ℹ️ "Claim" always opens the real store page in a new tab. No public API lets a third-party site add a game to someone's library, so claiming is finished manually.

---

## 🏗️ Tech Stack

### Frontend

- React 18 (Vite 5)
- React Router 6
- Tailwind CSS 4
- Framer Motion
- hls.js
- React Icons

### Backend (Vercel serverless functions)

- Node.js — `api/` directory
- Steam Web API + Steam OpenID
- fast-xml-parser (RSS parsing)

### Data sources

- GamerPower API — giveaways
- Steam Web API / Steam Store endpoints — profile, library, wishlist, achievements, game details
- Publisher RSS feeds — free-trial news

---

## 📂 Folder Structure

```
📦 FreeGamesTracker
┣ 📂 api/                    # Vercel serverless functions
┃ ┣ 📂 auth/
┃ ┃ ┣ 📜 steam-login.js      # Starts Steam OpenID login
┃ ┃ ┗ 📜 steam-callback.js   # Verifies the OpenID response
┃ ┣ 📜 steam.js              # Library + wishlist
┃ ┣ 📜 steam-profile.js      # Profile, friends, stats
┃ ┣ 📜 steam-friends.js      # Friend list for the picker
┃ ┣ 📜 steam-status.js       # Lightweight online / in-game status
┃ ┣ 📜 steam-appdetails.js   # Game detail data
┃ ┣ 📜 steam-achievements.js # Per-game achievements
┃ ┣ 📜 steam-image.js        # Game image resolver (batched)
┃ ┣ 📜 steam-video-proxy.js  # Trailer proxy (adds required Referer)
┃ ┣ 📜 steam-card-image.js   # Same-origin image proxy for share cards
┃ ┗ 📜 trial-news.js         # Publisher RSS scan
┣ 📂 public/
┃ ┣ 📂 icons/                # PWA icons
┃ ┣ 📜 manifest.json
┃ ┗ 📜 sw.js                 # Service worker
┣ 📂 src/
┃ ┣ 📂 components/           # Nav, Hero, Filters, GameCard, Compare*, Steam* ...
┃ ┣ 📂 context/              # Theme, Favorites, Steam
┃ ┣ 📂 hooks/                # useGiveaways, useSteamProfileData, useScrollLock, ...
┃ ┣ 📂 lib/                  # platforms, steamCompare, steamListControls, ...
┃ ┣ 📂 pages/steam/          # Wishlist, Library, Matches, Compare, Group compare, Game pages
┃ ┣ 📜 App.jsx               # Routes
┃ ┗ 📜 main.jsx
┣ 📜 vercel.json             # SPA rewrites for /steam/*
┣ 📜 vite.config.js
┗ 📜 package.json
```

---

## ⚙️ Environment Variables

Steam features need a Steam Web API key ([get one free](https://steamcommunity.com/dev/apikey)).

Local development — create `.env.local` in the project root:

```
STEAM_API_KEY=your_steam_web_api_key
```

Production — add `STEAM_API_KEY` in Vercel → Project → Settings → Environment Variables.

⚠️ The key is only read by the serverless functions in `api/` and is never sent to the browser. Never commit it.

The main free-games page works without any key.

---

## 🛠️ Installation & Setup

Clone repository:

```bash
git clone https://github.com/Adityasharma3010/FreeGamesTracker.git
cd FreeGamesTracker
npm install
```

Run with Steam features (recommended) — uses the Vercel CLI so `api/` functions run locally:

```bash
npm i -g vercel
vercel dev
```

Run the front end only (no Steam functions):

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## 🔌 Serverless API Endpoints

All under `/api`:

| Endpoint                  | Description                                           |
| ------------------------- | ----------------------------------------------------- |
| `/auth/steam-login`       | Redirects to Steam OpenID                             |
| `/auth/steam-callback`    | Verifies Steam's signed response, returns the SteamID |
| `/steam`                  | Library + wishlist for a Steam ID / vanity URL        |
| `/steam-profile`          | Profile summary, friends, achievements overview       |
| `/steam-friends`          | Up to 100 friends for the compare picker              |
| `/steam-status`           | Online / in-game status polling                       |
| `/steam-appdetails`       | Store details, screenshots, trailers, reviews         |
| `/steam-achievements`     | Achievement list, unlock state, global rarity         |
| `/steam-image`            | Resolves game artwork (single or batched `appids=`)   |
| `/steam-video-proxy`      | Streams trailers with the correct Referer             |
| `/steam-card-image`       | Proxies images for the share-card canvas              |
| `/trial-news`             | Free-trial announcements from publisher RSS feeds     |

---

## 🔐 Steam Sign-in Flow

1. User clicks **Sign in with Steam** → `/api/auth/steam-login` redirects to Steam
2. Steam redirects back to `/api/auth/steam-callback`
3. The server re-posts the signed assertion to Steam (`check_authentication`) — login is only trusted if Steam confirms it
4. The verified SteamID is passed to the front end, saved in `localStorage`, and removed from the URL

Steam data is only visible if the Steam profile's game details are set to **Public**.

---

## 🎨 Design System / Editing Colors

Platform brand colors and icons live in `src/lib/platforms.js` — they are applied via inline styles because they're chosen at runtime per giveaway.

Dark / light theme tokens (backgrounds, text, borders, glow blobs) live in `src/context/ThemeContext.jsx` in `buildTheme()` — edit those to retheme the whole site.

---

## 📲 PWA & Android

`public/manifest.json` + `public/sw.js` make the app installable. The service worker is **network-first**, with the cache used only as an offline fallback, so new deployments are picked up immediately.

Planned: wrap the deployed site as an Android app with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap):

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://your-domain.com/manifest.json
bubblewrap build
```

---

## 🚀 Deployment

Deploy on Vercel (required for the Steam serverless functions):

1. Import the GitHub repo
2. Framework preset: Vite — build command `npm run build`, output directory `dist`
3. Add `STEAM_API_KEY` in Environment Variables
4. Deploy

`vercel.json` already rewrites `/steam/*` to `index.html` so deep links and refreshes work.

---

## ⚠️ Known Limitations

- The Steam **wishlist** endpoint is unofficial (Valve publishes no wishlist API) and could change without notice
- GamerPower has no separate "free weekend" vs "free trial" type, so those share one filter chip
- Free-trial news detection is a keyword heuristic on RSS titles — it can miss articles by design, rather than mislabel them
- Steam can rate-limit or bot-block heavy requests; images and trailers can occasionally fail to load

---

## 🧠 Future Improvements

- "Ending soon" urgency badges
- Accessibility focus states
- Android wrap with Bubblewrap
- Price and discount info on wishlist tiles
- Co-op / multiplayer filter in compare
- Group-compare matrix view

---

## 🤝 Contributing

Fork → Create branch → Commit → Pull Request

---

## 📄 License

MIT License

---

## 👨‍💻 Author

Aditya Sharma  
Website: [https://adityasharma.site](https://adityasharma.site)

---

⭐ If you like this project, please give it a star!