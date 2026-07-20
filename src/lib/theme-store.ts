import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "jobbidder-theme";
const listeners = new Set<(theme: Theme) => void>();

export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private browsing, disabled); theme still applies for this session.
  }
  listeners.forEach((fn) => fn(theme));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    setThemeState(getTheme());
    listeners.add(setThemeState);
    return () => {
      listeners.delete(setThemeState);
    };
  }, []);

  return {
    theme,
    toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"),
  };
}
