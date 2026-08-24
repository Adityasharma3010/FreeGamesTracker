# Free Games Tracker

React + Vite + Tailwind. Static site, no backend — fetches live giveaways
client-side from the [GamerPower API](https://www.gamerpower.com/api-read)
(no key required, CORS-enabled).

## Run locally

```bash
npm install
npm run dev
```

## Build for deploy

```bash
npm run build
```

Outputs to `dist/`. Deploy `dist/` as-is to Vercel, Netlify, or GitHub
Pages — it's a fully static bundle.

- **Vercel / Netlify**: point the project root at this folder, build
  command `npm run build`, output directory `dist`.
- **GitHub Pages**: you'll need to set `base` in `vite.config.js` to your
  repo name (e.g. `base: '/free-games-tracker/'`) if it's not deployed at
  the domain root, then push `dist/` to the `gh-pages` branch.

## Project structure

```
src/
  components/     UI pieces (Nav, Hero, Filters, GameCard, GameGrid, WatchView, Chip, AmbientBackground)
  context/        ThemeContext — persisted dark/light state + color tokens
  hooks/          useGiveaways — fetch + 10min localStorage cache of the API
  lib/platforms.js  Platform brand colors/icons + GamerPower platform-string matching
tailwind.config.js  Platform brand colors, custom `watch` screen, animation keyframes
public/
  manifest.json, sw.js, icons/   PWA assets
```

## Design system / editing colors

Platform accent colors live in two places that should stay in sync:

- `src/lib/platforms.js` — used for the actual dynamic per-card theming
  (colors are applied via inline styles since they're chosen at runtime
  per giveaway, which Tailwind's static class scanning can't do safely).
- `tailwind.config.js` `theme.extend.colors` — same hex values, exposed
  as utility classes (`bg-steam`, `text-xbox`, etc.) for anywhere you
  want to reference a platform color in markup directly instead of via
  the `theme` object.

Dark/light theme tokens (backgrounds, text, borders, glow blobs) live in
`src/context/ThemeContext.jsx` in the `buildTheme()` function — edit
those two objects to retheme the whole site.

## PWA / installability

`public/manifest.json` + `public/sw.js` make this installable as-is.
Replace the placeholder icons in `public/icons/` with real artwork before
shipping (192, 512, and a 512 maskable icon — maskable needs your logo
kept inside the safe zone, roughly the center 80%).

## Android wrap (Bubblewrap) — later step

Once deployed to a real HTTPS URL:

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://yourdomain.com/manifest.json
bubblewrap build
```

Bubblewrap will ask for the deployed URL, app id, and signing key details
and produce a signed APK/AAB. No code changes needed here for that step
as long as the manifest and service worker are in place, which they are.

## Notes on the "Claim" button

GamerPower gives you `open_giveaway_url` — the real claim/store page.
There's no public API for Steam, PlayStation, Xbox, GOG, or Epic that
lets a third-party site add a game to someone's library automatically,
so "Claim" always opens that real page in a new tab for the user to
finish manually. This is stated on the page itself (under the hero) so
it isn't a surprise.

## Known placeholder / TODO

- `public/icons/*.png` are generated placeholders — swap for real art.
- GamerPower's `type` field only distinguishes game / DLC-loot / beta —
  there's no explicit "free weekend" vs "free trial" split in the API,
  so those are grouped under the same filter chip in `lib/platforms.js`
  (`TYPES`). If GamerPower adds finer typing later, extend that map.
