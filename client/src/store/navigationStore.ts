import { create } from "zustand";

export type MobileTab = 'home' | 'workspace' | 'projects' | 'search' | 'settings';

interface NavigationState {
  activeTab: MobileTab;
  previousTab: MobileTab | null;
  commandPaletteOpen: boolean;

  setActiveTab: (tab: MobileTab) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  activeTab: 'home',
  previousTab: null,
  commandPaletteOpen: false,

  setActiveTab: (tab) => {
    const { activeTab } = get();
    if (tab === activeTab) return;
    set({ previousTab: activeTab, activeTab: tab });
  },

  openCommandPalette: () => {
    set({ commandPaletteOpen: true });
  },

  closeCommandPalette: () => {
    set({ commandPaletteOpen: false });
  },
}));
