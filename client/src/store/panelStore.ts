import { create } from "zustand";

export type PanelId =
  | "ai"
  | "terminal"
  | "editor"
  | "files"
  | "git"
  | "logs"
  | "preview"
  | "search";

export type DockPosition = "left" | "right" | "bottom" | "float";

export interface PanelConfig {
  id: PanelId;
  position: DockPosition;
  width?: number;
  height?: number;
  visible: boolean;
  order: number;
}

const STORAGE_KEY = "pocketdevos-panel-layout";
const MIN_WIDTH = 200;
const MIN_HEIGHT = 120;

const DEFAULT_PANELS: PanelConfig[] = [
  { id: "ai", position: "left", width: 400, visible: true, order: 0 },
  { id: "editor", position: "right", width: 600, visible: true, order: 1 },
  { id: "terminal", position: "bottom", height: 250, visible: true, order: 2 },
  { id: "files", position: "left", width: 240, visible: false, order: 3 },
  { id: "git", position: "right", width: 300, visible: false, order: 4 },
  { id: "logs", position: "bottom", height: 200, visible: false, order: 5 },
  { id: "preview", position: "right", width: 500, visible: false, order: 6 },
  { id: "search", position: "left", width: 300, visible: false, order: 7 },
];

interface PanelState {
  panels: PanelConfig[];
  sidebarCollapsed: boolean;

  setPanels: (panels: PanelConfig[]) => void;
  togglePanel: (id: PanelId) => void;
  movePanel: (id: PanelId, position: DockPosition) => void;
  resizePanel: (id: PanelId, width?: number, height?: number) => void;
  toggleSidebar: () => void;
  persistLayout: () => void;
  restoreLayout: () => void;
}

export const usePanelStore = create<PanelState>((set, get) => ({
  panels: DEFAULT_PANELS,
  sidebarCollapsed: false,

  setPanels: (panels) => {
    set({ panels });
  },

  togglePanel: (id) => {
    const { panels } = get();
    set({
      panels: panels.map((p) =>
        p.id === id ? { ...p, visible: !p.visible } : p,
      ),
    });
  },

  movePanel: (id, position) => {
    const { panels } = get();
    set({
      panels: panels.map((p) => (p.id === id ? { ...p, position } : p)),
    });
  },

  resizePanel: (id, width?, height?) => {
    const { panels } = get();
    set({
      panels: panels.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p };
        if (width !== undefined) {
          updated.width = Math.max(width, MIN_WIDTH);
        }
        if (height !== undefined) {
          updated.height = Math.max(height, MIN_HEIGHT);
        }
        return updated;
      }),
    });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  persistLayout: () => {
    const { panels, sidebarCollapsed } = get();
    try {
      const data = JSON.stringify({ panels, sidebarCollapsed });
      localStorage.setItem(STORAGE_KEY, data);
    } catch {
      // localStorage may be unavailable or full — fail silently
    }
  },

  restoreLayout: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.panels)) {
        set({
          panels: data.panels,
          sidebarCollapsed: Boolean(data.sidebarCollapsed),
        });
      }
    } catch {
      // Corrupted data — fall back to current (default) layout
    }
  },
}));
