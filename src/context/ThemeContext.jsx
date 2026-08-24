import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "fgt-theme";

const ThemeContext = createContext(null);

// Same approach as the mockup: theme colors come from a JS object driven
// by state, not from Tailwind's `dark:` variant. This is deliberate —
// it guarantees every consumer re-renders with the right colors instead
// of quietly depending on a CSS strategy that can be misconfigured.
// Tailwind's `dark:` classes are still used for the FEW things that are
// pure layout/spacing (no color), where it's harmless.
function buildTheme(dark) {
  return dark
    ? {
        dark: true,
        pageBg: "#060608",
        gridLine: "rgba(168,85,247,0.22)",
        blob1: "rgba(217,70,239,0.18)",
        blob2: "rgba(34,211,238,0.16)",
        navBg: "rgba(10,10,14,0.75)",
        navBorder: "rgba(255,255,255,0.1)",
        heroBg: "radial-gradient(ellipse at top, #2a1055 0%, #060608 65%)",
        text: "#ffffff",
        textDim: "rgba(255,255,255,0.55)",
        textFaint: "rgba(255,255,255,0.4)",
        surface: "rgba(255,255,255,0.05)",
        surfaceBorder: "rgba(255,255,255,0.12)",
        panelBg: "rgba(12,13,20,0.92)",
        panelBorder: "rgba(255,255,255,0.12)",
        chipBg: "rgba(255,255,255,0.04)",
        chipBorder: "rgba(255,255,255,0.15)",
        chipText: "rgba(255,255,255,0.75)",
        cardBase: "#0a0a10",
        toggleInactive: "#8a8a8a",
        danger: "#ff6161",
      }
    : {
        dark: false,
        pageBg: "#f4f1fb",
        gridLine: "rgba(124,58,237,0.16)",
        blob1: "rgba(236,72,153,0.22)",
        blob2: "rgba(14,165,233,0.2)",
        navBg: "rgba(255,255,255,0.85)",
        navBorder: "rgba(0,0,0,0.08)",
        heroBg: "radial-gradient(ellipse at top, #ffd7f0 0%, #f4f1fb 65%)",
        text: "#15121f",
        textDim: "rgba(21,18,31,0.65)",
        textFaint: "rgba(21,18,31,0.45)",
        surface: "#ffffff",
        surfaceBorder: "rgba(0,0,0,0.1)",
        panelBg: "rgba(255,255,255,0.95)",
        panelBorder: "rgba(0,0,0,0.1)",
        chipBg: "#ffffff",
        chipBorder: "rgba(0,0,0,0.15)",
        chipText: "#3a3550",
        cardBase: "#ffffff",
        toggleInactive: "#a3a3a3",
        danger: "#d21d1d",
      };
}

export function ThemeProvider({ children }) {
  const [dark, setDarkState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored === "dark";
    } catch (e) {
      /* localStorage unavailable (private mode, etc) — fall through */
    }
    return true; // dark is the default/primary aesthetic
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    } catch (e) {}
    document.documentElement.classList.toggle("dark", dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#060608" : "#f4f1fb");
  }, [dark]);

  const value = {
    dark,
    setDark: setDarkState,
    toggle: () => setDarkState((d) => !d),
    theme: buildTheme(dark),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
