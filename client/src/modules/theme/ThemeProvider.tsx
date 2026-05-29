import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { themes, getThemeById, type Theme } from "./themes";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (id: string) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "pocketdevos-theme";

function applyThemeToRoot(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty("--bg-primary", theme.colors.bgPrimary);
  root.style.setProperty("--bg-secondary", theme.colors.bgSecondary);
  root.style.setProperty("--bg-tertiary", theme.colors.bgTertiary);
  root.style.setProperty("--border", theme.colors.border);
  root.style.setProperty("--text-primary", theme.colors.textPrimary);
  root.style.setProperty("--text-secondary", theme.colors.textSecondary);
  root.style.setProperty("--accent", theme.colors.accent);
  root.style.setProperty("--accent-hover", theme.colors.accentHover);
  root.style.setProperty("--danger", theme.colors.danger);
  root.style.setProperty("--success", theme.colors.success);

  // Update meta theme-color for mobile browsers
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme.colors.bgPrimary);
  }
}

function loadSavedThemeId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "dark";
  } catch {
    return "dark";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getThemeById(loadSavedThemeId()));

  // Apply theme on mount and changes
  useEffect(() => {
    applyThemeToRoot(theme);
  }, [theme]);

  const setTheme = useCallback((id: string) => {
    const newTheme = getThemeById(id);
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
