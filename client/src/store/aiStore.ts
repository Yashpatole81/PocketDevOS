import { create } from "zustand";

export type ProviderId = "nvidia" | "ollama" | "custom";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCall?: {
    id: string;
    name: string;
    args: Record<string, any>;
  };
  toolResult?: {
    id: string;
    name: string;
    result: string;
  };
  timestamp: number;
}

export interface PendingApproval {
  id: string;
  tool: string;
  args: Record<string, any>;
}

export type AiStatus = "idle" | "thinking" | "awaiting-approval" | "error";

export interface AgentAction {
  id: string;
  type: 'file-read' | 'file-write' | 'search' | 'test-run' | 'code-gen' | 'approval-wait' | 'shell-run';
  label: string;
  timestamp: number;
  status: 'running' | 'success' | 'failure' | 'skipped';
  detail?: string;
}

export interface ContextAttachment {
  id: string;
  type: 'file' | 'terminal-output' | 'git-ref';
  name: string;
  content: string;
}

interface AiState {
  messages: ChatMessage[];
  status: AiStatus;
  pendingApproval: PendingApproval | null;
  provider: ProviderId;
  model: string;
  baseUrl: string;
  sessionId: string;
  error: string | null;
  panelOpen: boolean;
  settingsOpen: boolean;

  // Agent activity and context attachments
  agentActions: AgentAction[];
  activityFeedCollapsed: boolean;
  contextAttachments: ContextAttachment[];
  scrollPosition: number;

  // Actions
  addMessage: (message: ChatMessage) => void;
  appendToLastAssistant: (content: string) => void;
  setStatus: (status: AiStatus) => void;
  setPendingApproval: (approval: PendingApproval | null) => void;
  setProvider: (provider: ProviderId) => void;
  setModel: (model: string) => void;
  setBaseUrl: (url: string) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  togglePanel: () => void;
  setPanel: (open: boolean) => void;
  toggleSettings: () => void;

  // Agent activity actions
  addAgentAction: (action: AgentAction) => void;
  updateAgentAction: (id: string, update: Partial<AgentAction>) => void;
  toggleActivityFeed: () => void;

  // Context attachment actions
  addAttachment: (attachment: ContextAttachment) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  setScrollPosition: (pos: number) => void;
}

let messageCounter = 0;
function generateId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

export const useAiStore = create<AiState>((set, get) => ({
  messages: [],
  status: "idle",
  pendingApproval: null,
  provider: "ollama",
  model: "gemma4:12b",
  baseUrl: "http://localhost:11434/v1",
  sessionId: `session_${Date.now()}`,
  error: null,
  panelOpen: false,
  settingsOpen: false,

  // Agent activity and context attachments
  agentActions: [],
  activityFeedCollapsed: false,
  contextAttachments: [],
  scrollPosition: 0,

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  appendToLastAssistant: (content) => {
    set((state) => {
      const messages = [...state.messages];
      const lastIdx = messages.length - 1;

      if (lastIdx >= 0 && messages[lastIdx].role === "assistant" && !messages[lastIdx].toolCall) {
        messages[lastIdx] = {
          ...messages[lastIdx],
          content: messages[lastIdx].content + content,
        };
      } else {
        // Create new assistant message
        messages.push({
          id: generateId(),
          role: "assistant",
          content,
          timestamp: Date.now(),
        });
      }

      return { messages };
    });
  },

  setStatus: (status) => set({ status }),

  setPendingApproval: (approval) => set({ pendingApproval: approval }),

  setProvider: (provider) => set({ provider }),

  setModel: (model) => set({ model }),

  setBaseUrl: (baseUrl) => set({ baseUrl }),

  setError: (error) => set({ error, status: error ? "error" : "idle" }),

  clearMessages: () => {
    set({
      messages: [],
      status: "idle",
      pendingApproval: null,
      error: null,
      sessionId: `session_${Date.now()}`,
    });
  },

  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),

  setPanel: (open) => set({ panelOpen: open }),

  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),

  // Agent activity actions
  addAgentAction: (action) => {
    set((state) => ({ agentActions: [...state.agentActions, action] }));
  },

  updateAgentAction: (id, update) => {
    set((state) => ({
      agentActions: state.agentActions.map((action) =>
        action.id === id ? { ...action, ...update } : action
      ),
    }));
  },

  toggleActivityFeed: () => set((state) => ({ activityFeedCollapsed: !state.activityFeedCollapsed })),

  // Context attachment actions
  addAttachment: (attachment) => {
    set((state) => ({ contextAttachments: [...state.contextAttachments, attachment] }));
  },

  removeAttachment: (id) => {
    set((state) => ({
      contextAttachments: state.contextAttachments.filter((a) => a.id !== id),
    }));
  },

  clearAttachments: () => set({ contextAttachments: [] }),

  setScrollPosition: (pos) => set({ scrollPosition: pos }),
}));
