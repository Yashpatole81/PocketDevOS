export interface Theme {
  id: string;
  name: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgElevated: string;
    bgTerminal: string;
    bgSidebar: string;
    border: string;
    borderSubtle: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentHover: string;
    accentGlow: string;
    danger: string;
    success: string;
    warning: string;
    info: string;
  };
}

export const themes: Theme[] = [
  {
    id: "midnight",
    name: "Midnight",
    colors: {
      bgPrimary: "#000000",
      bgSecondary: "#0A0A0A",
      bgTertiary: "#141414",
      bgElevated: "#1A1A1A",
      bgTerminal: "#000000",
      bgSidebar: "#0A0A0A",
      border: "#222222",
      borderSubtle: "#1A1A1A",
      textPrimary: "#FFFFFF",
      textSecondary: "#A0A0A0",
      textMuted: "#666666",
      accent: "#FFFFFF",
      accentHover: "#E0E0E0",
      accentGlow: "rgba(255,255,255,0.1)",
      danger: "#F87171",
      success: "#4ADE80",
      warning: "#FBBF24",
      info: "#60A5FA",
    },
  },
  {
    id: "carbon",
    name: "Carbon",
    colors: {
      bgPrimary: "#0C0C0C",
      bgSecondary: "#161616",
      bgTertiary: "#1E1E1E",
      bgElevated: "#262626",
      bgTerminal: "#0C0C0C",
      bgSidebar: "#161616",
      border: "#2A2A2A",
      borderSubtle: "#1E1E1E",
      textPrimary: "#F4F4F4",
      textSecondary: "#B0B0B0",
      textMuted: "#6F6F6F",
      accent: "#F4F4F4",
      accentHover: "#D0D0D0",
      accentGlow: "rgba(244,244,244,0.08)",
      danger: "#FF6B6B",
      success: "#6BCB77",
      warning: "#FFD93D",
      info: "#6C9BCF",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    colors: {
      bgPrimary: "#1a1b26",
      bgSecondary: "#16161e",
      bgTertiary: "#24283b",
      bgElevated: "#292e42",
      bgTerminal: "#13131e",
      bgSidebar: "#16161e",
      border: "#3b4261",
      borderSubtle: "#292e42",
      textPrimary: "#c0caf5",
      textSecondary: "#9aa5ce",
      textMuted: "#565f89",
      accent: "#7aa2f7",
      accentHover: "#89b4fa",
      accentGlow: "rgba(122,162,247,0.15)",
      danger: "#f7768e",
      success: "#9ece6a",
      warning: "#e0af68",
      info: "#7dcfff",
    },
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    colors: {
      bgPrimary: "#1e1e2e",
      bgSecondary: "#181825",
      bgTertiary: "#313244",
      bgElevated: "#45475a",
      bgTerminal: "#11111b",
      bgSidebar: "#181825",
      border: "#45475a",
      borderSubtle: "#313244",
      textPrimary: "#cdd6f4",
      textSecondary: "#a6adc8",
      textMuted: "#6c7086",
      accent: "#cba6f7",
      accentHover: "#b4befe",
      accentGlow: "rgba(203,166,247,0.15)",
      danger: "#f38ba8",
      success: "#a6e3a1",
      warning: "#fab387",
      info: "#89dceb",
    },
  },
  {
    id: "nord",
    name: "Nord",
    colors: {
      bgPrimary: "#2e3440",
      bgSecondary: "#3b4252",
      bgTertiary: "#434c5e",
      bgElevated: "#4c566a",
      bgTerminal: "#242933",
      bgSidebar: "#2e3440",
      border: "#4c566a",
      borderSubtle: "#3b4252",
      textPrimary: "#eceff4",
      textSecondary: "#d8dee9",
      textMuted: "#81a1c1",
      accent: "#88c0d0",
      accentHover: "#8fbcbb",
      accentGlow: "rgba(136,192,208,0.15)",
      danger: "#bf616a",
      success: "#a3be8c",
      warning: "#ebcb8b",
      info: "#81a1c1",
    },
  },
];

export function getThemeById(id: string): Theme {
  return themes.find((t) => t.id === id) || themes[0];
}
