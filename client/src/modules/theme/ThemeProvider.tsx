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
  const c = theme.colors;

  root.style.setProperty("--bg-primary", c.bgPrimary);
  root.style.setProperty("--bg-secondary", c.bgSecondary);
  root.style.setProperty("--bg-tertiary", c.bgTertiary);
  root.style.setProperty("--bg-elevated", c.bgElevated);
  root.style.setProperty("--bg-terminal", c.bgTerminal);
  root.style.setProperty("--bg-sidebar", c.bgSidebar);
  root.style.setProperty("--border", c.border);
  root.style.setProperty("--border-subtle", c.borderSubtle);
  root.style.setProperty("--text-primary", c.textPrimary);
  root.style.setProperty("--text-secondary", c.textSecondary);
  root.style.setProperty("--text-muted", c.textMuted);
  root.style.setProperty("--accent", c.accent);
  root.style.setProperty("--accent-hover", c.accentHover);
  root.style.setProperty("--accent-glow", c.accentGlow);
  root.style.setProperty("--danger", c.danger);
  root.style.setProperty("--success", c.success);
  root.style.setProperty("--warning", c.warning);
  root.style.setProperty("--info", c.info);

  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", c.bgPrimary);
}

function loadSavedThemeId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "cyberdeck";
  } catch {
    return "cyberdeck";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getThemeById(loadSavedThemeId()));

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
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
