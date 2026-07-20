import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-store";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed top-4 right-4 z-[9997] print:hidden flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 backdrop-blur-sm text-foreground shadow-card transition hover:bg-accent"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
