/**
 * Monochrome Theme System
 *
 * A minimal black-and-white theme with neutral grays and a single accent color.
 * Elevation is defined through subtle border opacity differences (no shadows).
 * Spacing uses a 4px base unit grid.
 */

// --- Theme Interface ---

export interface MonochromeTheme {
  id: string;
  name: string;
  accentColor: string;
  colors: {
    background: '#000000';
    surface1: '#0A0A0A';
    surface2: '#111111';
    surface3: '#1A1A1A';
    border: string; // 8-12% white opacity
    textPrimary: '#FFFFFF';
    textSecondary: '#A0A0A0';
    textMuted: '#666666';
    accent: string;
    accentHover: string;
    danger: '#F87171';
    success: '#4ADE80';
    warning: '#FBBF24';
  };
}

// --- Spacing Scale (4px base unit) ---

export const SPACING_BASE = 4;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * Returns a spacing value in pixels from the 4px base unit scale.
 */
export function getSpacing(key: SpacingKey): number {
  return spacing[key];
}

// --- Border Styles (1px borders at 8-12% white opacity, no shadows) ---

export const borders = {
  subtle: '1px solid rgba(255, 255, 255, 0.08)',
  default: '1px solid rgba(255, 255, 255, 0.10)',
  strong: '1px solid rgba(255, 255, 255, 0.12)',
} as const;

export type BorderKey = keyof typeof borders;

// --- Default "Midnight" Theme ---

export const midnightTheme: MonochromeTheme = {
  id: 'midnight',
  name: 'Midnight',
  accentColor: '#FFFFFF',
  colors: {
    background: '#000000',
    surface1: '#0A0A0A',
    surface2: '#111111',
    surface3: '#1A1A1A',
    border: 'rgba(255, 255, 255, 0.10)',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#666666',
    accent: '#FFFFFF',
    accentHover: '#E0E0E0',
    danger: '#F87171',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
};

// --- CSS Custom Properties ---

export interface ThemeCSSProperties {
  '--color-background': string;
  '--color-surface-1': string;
  '--color-surface-2': string;
  '--color-surface-3': string;
  '--color-border': string;
  '--color-text-primary': string;
  '--color-text-secondary': string;
  '--color-text-muted': string;
  '--color-accent': string;
  '--color-accent-hover': string;
  '--color-danger': string;
  '--color-success': string;
  '--color-warning': string;
  '--spacing-xs': string;
  '--spacing-sm': string;
  '--spacing-md': string;
  '--spacing-base': string;
  '--spacing-lg': string;
  '--spacing-xl': string;
  '--spacing-2xl': string;
  '--border-subtle': string;
  '--border-default': string;
  '--border-strong': string;
}

/**
 * Generates a map of CSS custom properties from a MonochromeTheme.
 * These can be applied to :root or any container element.
 */
export function generateCSSProperties(theme: MonochromeTheme): ThemeCSSProperties {
  return {
    '--color-background': theme.colors.background,
    '--color-surface-1': theme.colors.surface1,
    '--color-surface-2': theme.colors.surface2,
    '--color-surface-3': theme.colors.surface3,
    '--color-border': theme.colors.border,
    '--color-text-primary': theme.colors.textPrimary,
    '--color-text-secondary': theme.colors.textSecondary,
    '--color-text-muted': theme.colors.textMuted,
    '--color-accent': theme.colors.accent,
    '--color-accent-hover': theme.colors.accentHover,
    '--color-danger': theme.colors.danger,
    '--color-success': theme.colors.success,
    '--color-warning': theme.colors.warning,
    '--spacing-xs': `${spacing.xs}px`,
    '--spacing-sm': `${spacing.sm}px`,
    '--spacing-md': `${spacing.md}px`,
    '--spacing-base': `${spacing.base}px`,
    '--spacing-lg': `${spacing.lg}px`,
    '--spacing-xl': `${spacing.xl}px`,
    '--spacing-2xl': `${spacing['2xl']}px`,
    '--border-subtle': borders.subtle,
    '--border-default': borders.default,
    '--border-strong': borders.strong,
  };
}

// --- Theme Retrieval ---

/**
 * Returns the default monochrome theme.
 * The system enforces a single monochrome palette — this always returns "midnight".
 */
export function getDefaultTheme(): MonochromeTheme {
  return midnightTheme;
}

// Legacy compatibility alias
export function getThemeById(_id: string): MonochromeTheme {
  return midnightTheme;
}

// Legacy compatibility: export as Theme for existing consumers
export type Theme = MonochromeTheme;

// Legacy compatibility: export themes array with single entry
export const themes: MonochromeTheme[] = [midnightTheme];
