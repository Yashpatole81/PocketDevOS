import { create } from "zustand";

export interface EditorSettings {
  fontSize: number;
  tabSize: 2 | 4;
  wordWrap: boolean;
  vimMode: boolean;
}

export interface TerminalSettings {
  fontSize: number;
  scrollbackLines: number;
}

export interface GeneralSettings {
  theme: string;
  workspacePath: string;
}

export interface SettingsState {
  general: GeneralSettings;
  editor: EditorSettings;
  terminal: TerminalSettings;
  settingsOpen: boolean;

  // Actions
  setGeneral: (partial: Partial<GeneralSettings>) => void;
  setEditor: (partial: Partial<EditorSettings>) => void;
  setTerminal: (partial: Partial<TerminalSettings>) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const STORAGE_KEY = "pocketdevos-settings";

function loadSettings(): { general: GeneralSettings; editor: EditorSettings; terminal: TerminalSettings } {
  const defaults = {
    general: { theme: "dark", workspacePath: "" },
    editor: { fontSize: 14, tabSize: 2 as const, wordWrap: true, vimMode: false },
    terminal: { fontSize: 14, scrollbackLines: 1000 },
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        general: { ...defaults.general, ...parsed.general },
        editor: { ...defaults.editor, ...parsed.editor },
        terminal: { ...defaults.terminal, ...parsed.terminal },
      };
    }
  } catch {
    // ignore
  }

  return defaults;
}

function saveSettings(state: { general: GeneralSettings; editor: EditorSettings; terminal: TerminalSettings }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = loadSettings();

  return {
    ...initial,
    settingsOpen: false,

    setGeneral: (partial) => {
      const next = { ...get().general, ...partial };
      set({ general: next });
      saveSettings({ general: next, editor: get().editor, terminal: get().terminal });
    },

    setEditor: (partial) => {
      const next = { ...get().editor, ...partial };
      set({ editor: next });
      saveSettings({ general: get().general, editor: next, terminal: get().terminal });
    },

    setTerminal: (partial) => {
      const next = { ...get().terminal, ...partial };
      set({ terminal: next });
      saveSettings({ general: get().general, editor: get().editor, terminal: next });
    },

    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),
  };
});
