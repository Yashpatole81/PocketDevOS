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
    id: "cyberdeck",
    name: "Cyberdeck",
    colors: {
      bgPrimary: "#0B0F17",
      bgSecondary: "#111827",
      bgTertiary: "#161F2E",
      bgElevated: "#1C2536",
      bgTerminal: "#0D1117",
      bgSidebar: "#0F1724",
      border: "#1E293B",
      borderSubtle: "#162032",
      textPrimary: "#F3F4F6",
      textSecondary: "#CBD5E1",
      textMuted: "#94A3B8",
      accent: "#7C5CFF",
      accentHover: "#9B7DFF",
      accentGlow: "#7C5CFF40",
      danger: "#F87171",
      success: "#4ADE80",
      warning: "#FB923C",
      info: "#38BDF8",
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
      accentGlow: "#7aa2f740",
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
      accentGlow: "#cba6f740",
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
      accentGlow: "#88c0d040",
      danger: "#bf616a",
      success: "#a3be8c",
      warning: "#ebcb8b",
      info: "#81a1c1",
    },
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    colors: {
      bgPrimary: "#1d2021",
      bgSecondary: "#282828",
      bgTertiary: "#3c3836",
      bgElevated: "#504945",
      bgTerminal: "#1d2021",
      bgSidebar: "#282828",
      border: "#504945",
      borderSubtle: "#3c3836",
      textPrimary: "#ebdbb2",
      textSecondary: "#d5c4a1",
      textMuted: "#928374",
      accent: "#d3869b",
      accentHover: "#b16286",
      accentGlow: "#d3869b40",
      danger: "#fb4934",
      success: "#b8bb26",
      warning: "#fabd2f",
      info: "#83a598",
    },
  },
  {
    id: "amoled",
    name: "Pure Black",
    colors: {
      bgPrimary: "#000000",
      bgSecondary: "#0A0A0A",
      bgTertiary: "#141414",
      bgElevated: "#1A1A1A",
      bgTerminal: "#000000",
      bgSidebar: "#050505",
      border: "#222222",
      borderSubtle: "#1A1A1A",
      textPrimary: "#FAFAFA",
      textSecondary: "#A0A0A0",
      textMuted: "#666666",
      accent: "#7C5CFF",
      accentHover: "#9B7DFF",
      accentGlow: "#7C5CFF40",
      danger: "#FF5555",
      success: "#50FA7B",
      warning: "#FFB86C",
      info: "#8BE9FD",
    },
  },
];

export function getThemeById(id: string): Theme {
  return themes.find((t) => t.id === id) || themes[0];
}
