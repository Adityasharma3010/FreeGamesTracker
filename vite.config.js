import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Static build, no server-side code — deploys as plain HTML/JS/CSS to
// Vercel / Netlify / GitHub Pages, and is the same bundle Bubblewrap
// will wrap into the Android APK later.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
