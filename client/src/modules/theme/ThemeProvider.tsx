import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { themes, getDefaultTheme, generateCSSProperties, type MonochromeTheme } from "./themes";

/**
 * System sans-serif font stack for UI elements.
 * Uses the platform's native system font for optimal rendering and familiarity.
 */
const FONT_UI = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Monospace font stack for code and terminal content.
 * Prioritizes popular developer fonts with system monospace fallback.
 */
const FONT_MONO = '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", "Cascadia Code", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

interface ThemeContextValue {
  theme: MonochromeTheme;
  setTheme: (id: string) => void;
  themes: MonochromeTheme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToRoot(theme: MonochromeTheme) {
  const root = document.documentElement;
  const properties = generateCSSProperties(theme);

  // Apply all color, spacing, and border CSS custom properties
  for (const [key, value] of Object.entries(properties)) {
    root.style.setProperty(key, value);
  }

  // Font family CSS variables (Requirement 9.6)
  root.style.setProperty('--font-ui', FONT_UI);
  root.style.setProperty('--font-mono', FONT_MONO);

  // Accent color usage tokens (Requirement 9.2)
  // The accent color is ONLY applied to these specific use cases:
  // - Active selections (e.g., selected tab, active nav item)
  // - AI action indicators (e.g., agent activity pulse)
  // - Confirmation buttons (e.g., approve, save, submit)
  // - Focus rings (e.g., keyboard focus outlines)
  root.style.setProperty('--color-accent-selection', theme.colors.accent);
  root.style.setProperty('--color-accent-ai-indicator', theme.colors.accent);
  root.style.setProperty('--color-accent-confirm', theme.colors.accent);
  root.style.setProperty('--color-accent-focus-ring', theme.colors.accent);

  // Update meta theme-color (create if it doesn't exist)
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', theme.colors.background);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<MonochromeTheme>(() => getDefaultTheme());

  useEffect(() => {
    applyThemeToRoot(theme);
  }, [theme]);

  const setTheme = useCallback((_id: string) => {
    // Monochrome system enforces a single theme
    setThemeState(getDefaultTheme());
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
