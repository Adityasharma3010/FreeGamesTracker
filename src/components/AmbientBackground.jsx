import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";

// Ambient glow/grid layer. Blur radius drops on small screens via the
// `sm:blur-[130px] blur-[60px]` pair below — heavy blur is one of the
// more expensive things a phone GPU does, so this keeps it cheap there.
export default function AmbientBackground() {
  const { theme } = useTheme();

  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none motion-safe:animate-grid-drift theme-transition"
        style={{
          backgroundImage: `linear-gradient(${theme.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridLine} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="fixed top-0 left-1/4 w-72 h-72 sm:w-[500px] sm:h-[500px] rounded-full blur-[60px] sm:blur-[130px] pointer-events-none theme-transition" style={{ background: theme.blob1 }} />
      <div className="fixed bottom-0 right-1/4 w-72 h-72 sm:w-[500px] sm:h-[500px] rounded-full blur-[60px] sm:blur-[130px] pointer-events-none theme-transition" style={{ background: theme.blob2 }} />
    </>
  );
}
