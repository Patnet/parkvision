"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "auto";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("parkvision-theme") as Theme | null;
      if (stored) setTheme(stored);
    } catch {
      // stockage indisponible (navigation privée) : on reste sur "auto"
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    try {
      window.localStorage.setItem("parkvision-theme", theme);
    } catch {
      // ignoré : préférence non persistée dans cette session
    }
  }, [theme]);

  const next: Record<Theme, Theme> = { dark: "light", light: "auto", auto: "dark" };
  const labels: Record<Theme, string> = {
    dark: "Thème : sombre",
    light: "Thème : clair",
    auto: "Thème : auto",
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Changer de thème"
      onClick={() => setTheme(next[theme])}
    >
      {labels[theme]}
    </button>
  );
}
