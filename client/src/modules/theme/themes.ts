export interface Theme {
  id: string;
  name: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    accentHover: string;
    danger: string;
    success: string;
  };
}

export const themes: Theme[] = [
  {
    id: "dark",
    name: "Dark",
    colors: {
      bgPrimary: "#0f0f0f",
      bgSecondary: "#1a1a1a",
      bgTertiary: "#252525",
      border: "#333333",
      textPrimary: "#e4e4e4",
      textSecondary: "#999999",
      accent: "#6366f1",
      accentHover: "#818cf8",
      danger: "#ef4444",
      success: "#22c55e",
    },
  },
  {
    id: "light",
    name: "Light",
    colors: {
      bgPrimary: "#ffffff",
      bgSecondary: "#f5f5f5",
      bgTertiary: "#e8e8e8",
      border: "#d4d4d4",
      textPrimary: "#1a1a1a",
      textSecondary: "#666666",
      accent: "#4f46e5",
      accentHover: "#6366f1",
      danger: "#dc2626",
      success: "#16a34a",
    },
  },
  {
    id: "nord",
    name: "Nord",
    colors: {
      bgPrimary: "#2e3440",
      bgSecondary: "#3b4252",
      bgTertiary: "#434c5e",
      border: "#4c566a",
      textPrimary: "#eceff4",
      textSecondary: "#d8dee9",
      accent: "#88c0d0",
      accentHover: "#8fbcbb",
      danger: "#bf616a",
      success: "#a3be8c",
    },
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    colors: {
      bgPrimary: "#1e1e2e",
      bgSecondary: "#181825",
      bgTertiary: "#313244",
      border: "#45475a",
      textPrimary: "#cdd6f4",
      textSecondary: "#a6adc8",
      accent: "#cba6f7",
      accentHover: "#b4befe",
      danger: "#f38ba8",
      success: "#a6e3a1",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    colors: {
      bgPrimary: "#1a1b26",
      bgSecondary: "#16161e",
      bgTertiary: "#24283b",
      border: "#3b4261",
      textPrimary: "#c0caf5",
      textSecondary: "#9aa5ce",
      accent: "#7aa2f7",
      accentHover: "#89b4fa",
      danger: "#f7768e",
      success: "#9ece6a",
    },
  },
];

export function getThemeById(id: string): Theme {
  return themes.find((t) => t.id === id) || themes[0];
}
