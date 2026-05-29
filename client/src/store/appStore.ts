import { create } from "zustand";

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  dirty: boolean;
}

interface AppState {
  workspacePath: string;
  openFiles: OpenFile[];
  activeFileIndex: number;
  sidebarOpen: boolean;

  // Actions
  openFile: (file: Omit<OpenFile, "dirty">) => void;
  closeFile: (path: string) => void;
  setActiveFile: (index: number) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileSaved: (path: string) => void;
  toggleSidebar: () => void;
  setWorkspace: (path: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  workspacePath: "",
  openFiles: [],
  activeFileIndex: -1,
  sidebarOpen: true,

  openFile: (file) => {
    const { openFiles } = get();
    const existingIndex = openFiles.findIndex((f) => f.path === file.path);

    if (existingIndex >= 0) {
      // File already open, just focus it
      set({ activeFileIndex: existingIndex });
    } else {
      // Open new file
      const newFile: OpenFile = { ...file, dirty: false };
      set({
        openFiles: [...openFiles, newFile],
        activeFileIndex: openFiles.length,
      });
    }
  },

  closeFile: (path) => {
    const { openFiles, activeFileIndex } = get();
    const index = openFiles.findIndex((f) => f.path === path);
    if (index < 0) return;

    const next = openFiles.filter((f) => f.path !== path);
    let newActive = activeFileIndex;

    if (next.length === 0) {
      newActive = -1;
    } else if (index <= activeFileIndex) {
      newActive = Math.max(0, activeFileIndex - 1);
    }

    set({ openFiles: next, activeFileIndex: newActive });
  },

  setActiveFile: (index) => {
    set({ activeFileIndex: index });
  },

  updateFileContent: (path, content) => {
    const { openFiles } = get();
    set({
      openFiles: openFiles.map((f) =>
        f.path === path ? { ...f, content, dirty: true } : f,
      ),
    });
  },

  markFileSaved: (path) => {
    const { openFiles } = get();
    set({
      openFiles: openFiles.map((f) =>
        f.path === path ? { ...f, dirty: false } : f,
      ),
    });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setWorkspace: (path) => {
    set({ workspacePath: path, openFiles: [], activeFileIndex: -1 });
  },
}));
