import { create } from "zustand";

export interface TerminalSession {
  id: string;
  label: string;
  pinned: boolean;
  status: 'connected' | 'disconnected' | 'reconnecting';
}

interface TerminalState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  recentCommands: string[];

  addSession: (session: TerminalSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  renameSession: (id: string, label: string) => void;
  pinSession: (id: string) => void;
  unpinSession: (id: string) => void;
  updateSessionStatus: (id: string, status: TerminalSession['status']) => void;
  addRecentCommand: (command: string) => void;
  persistPinnedSessions: () => void;
  restorePinnedSessions: () => void;
}

const PINNED_SESSIONS_KEY = 'pocketdevos:pinned-sessions';

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  recentCommands: [],

  addSession: (session) => {
    const { sessions } = get();
    if (sessions.some((s) => s.id === session.id)) return;
    set({ sessions: [...sessions, session] });
  },

  removeSession: (id) => {
    const { sessions, activeSessionId } = get();
    const next = sessions.filter((s) => s.id !== id);
    const newActiveId =
      activeSessionId === id
        ? (next.length > 0 ? next[0].id : null)
        : activeSessionId;
    set({ sessions: next, activeSessionId: newActiveId });
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
  },

  renameSession: (id, label) => {
    const { sessions } = get();
    set({
      sessions: sessions.map((s) =>
        s.id === id ? { ...s, label } : s,
      ),
    });
  },

  pinSession: (id) => {
    const { sessions } = get();
    set({
      sessions: sessions.map((s) =>
        s.id === id ? { ...s, pinned: true } : s,
      ),
    });
  },

  unpinSession: (id) => {
    const { sessions } = get();
    set({
      sessions: sessions.map((s) =>
        s.id === id ? { ...s, pinned: false } : s,
      ),
    });
  },

  updateSessionStatus: (id, status) => {
    const { sessions } = get();
    set({
      sessions: sessions.map((s) =>
        s.id === id ? { ...s, status } : s,
      ),
    });
  },

  addRecentCommand: (command) => {
    const { recentCommands } = get();
    // Avoid duplicates at the front; keep most recent first, cap at 50
    const filtered = recentCommands.filter((c) => c !== command);
    set({ recentCommands: [command, ...filtered].slice(0, 50) });
  },

  persistPinnedSessions: () => {
    const { sessions } = get();
    const pinned = sessions
      .filter((s) => s.pinned)
      .map(({ id, label, pinned, status }) => ({ id, label, pinned, status }));
    try {
      localStorage.setItem(PINNED_SESSIONS_KEY, JSON.stringify(pinned));
    } catch {
      // localStorage may be unavailable; fail silently
    }
  },

  restorePinnedSessions: () => {
    try {
      const raw = localStorage.getItem(PINNED_SESSIONS_KEY);
      if (!raw) return;
      const pinned: TerminalSession[] = JSON.parse(raw);
      if (!Array.isArray(pinned)) return;

      const { sessions } = get();
      // Merge restored pinned sessions with existing sessions, avoiding duplicates
      const existingIds = new Set(sessions.map((s) => s.id));
      const toAdd = pinned.filter((s) => !existingIds.has(s.id));
      if (toAdd.length > 0) {
        set({ sessions: [...sessions, ...toAdd] });
      }
    } catch {
      // localStorage may be unavailable or data corrupted; fail silently
    }
  },
}));
