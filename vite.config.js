import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Static build, no server-side code — deploys as plain HTML/JS/CSS to
// Vercel / Netlify / GitHub Pages, and is the same bundle Bubblewrap
// will wrap into the Android APK later.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Bind the dev server to all network interfaces, not just localhost —
  // this is what actually makes it reachable from other devices on your
  // LAN (e.g. testing on your phone). Setting it here instead of relying
  // on a `--host` CLI flag matters specifically for `vercel dev`: it
  // runs whatever's in package.json's "dev" script and only overrides
  // the port, it does NOT forward extra flags like `--listen` down to
  // Vite — confirmed by Vite's own dev-server log saying "use --host to
  // expose" even when `--listen 0.0.0.0:PORT` was passed to `vercel dev`.
  // Configuring it here works for both `npm run dev` and `vercel dev`
  // uniformly, since both ultimately launch this same Vite config.
  server: {
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
