/**
 * API client for communicating with the PocketDevOS server.
 * Replaces Tauri's invoke() calls.
 */

const BASE_URL = "";

// Auth token is passed via URL query on first load, then stored
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// File system API
export const fs = {
  readdir: (path: string) =>
    request<{ items: FsEntry[] }>(`/api/fs/readdir?path=${encodeURIComponent(path)}`),

  read: (path: string) =>
    request<{ content: string; name: string; size: number }>(`/api/fs/read?path=${encodeURIComponent(path)}`),

  write: (path: string, content: string) =>
    request<{ ok: boolean }>("/api/fs/write", {
      method: "POST",
      body: JSON.stringify({ path, content }),
    }),

  stat: (path: string) =>
    request<FsStat>(`/api/fs/stat?path=${encodeURIComponent(path)}`),

  create: (path: string, type: "file" | "directory", content?: string) =>
    request<{ ok: boolean }>("/api/fs/create", {
      method: "POST",
      body: JSON.stringify({ path, type, content }),
    }),

  rename: (from: string, to: string) =>
    request<{ ok: boolean }>("/api/fs/rename", {
      method: "POST",
      body: JSON.stringify({ from, to }),
    }),

  delete: (path: string) =>
    request<{ ok: boolean }>("/api/fs/delete", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
};

// Terminal API
export const terminal = {
  create: (options?: { cols?: number; rows?: number; cwd?: string }) =>
    request<{ id: string; cols: number; rows: number }>("/api/terminal/create", {
      method: "POST",
      body: JSON.stringify(options || {}),
    }),

  list: () =>
    request<{ sessions: Array<{ id: string; cols: number; rows: number }> }>("/api/terminal/list"),

  resize: (id: string, cols: number, rows: number) =>
    request<{ ok: boolean }>(`/api/terminal/${id}/resize`, {
      method: "POST",
      body: JSON.stringify({ cols, rows }),
    }),

  kill: (id: string) =>
    request<{ ok: boolean }>(`/api/terminal/${id}`, { method: "DELETE" }),

  /**
   * Create a WebSocket connection to a terminal session.
   */
  connect: (id: string): WebSocket => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const tokenParam = authToken ? `?token=${authToken}` : "";
    return new WebSocket(`${protocol}//${host}/api/terminal/${id}/ws${tokenParam}`);
  },
};

// Shell API (one-shot commands)
export const shell = {
  run: (command: string, cwd?: string, timeout?: number) =>
    request<CommandOutput>("/api/shell/run", {
      method: "POST",
      body: JSON.stringify({ command, cwd, timeout }),
    }),
};

// AI API
export const ai = {
  chat: (messages: Array<{ role: string; content: string }>, sessionId: string, signal?: AbortSignal) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    return fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages, sessionId }),
      signal,
    });
  },

  approve: (sessionId: string) =>
    request<{ ok: boolean }>("/api/ai/approve", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),

  reject: (sessionId: string) =>
    request<{ ok: boolean }>("/api/ai/reject", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),

  stop: (sessionId: string) =>
    request<{ ok: boolean; stopped: boolean }>("/api/ai/stop", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }),

  getConfig: () =>
    request<AiConfigResponse>("/api/ai/config"),

  setConfig: (config: { provider?: string; model?: string; baseUrl?: string; apiKey?: string }) =>
    request<{ ok: boolean; current: AiCurrentConfig }>("/api/ai/config", {
      method: "POST",
      body: JSON.stringify(config),
    }),
};

// Types
export interface AiCurrentConfig {
  provider: string;
  model: string;
  baseUrl: string;
  hasKey: boolean;
}

export interface AiConfigResponse {
  providers: Array<{
    id: string;
    name: string;
    baseURL: string;
    requiresKey: boolean;
    description: string;
  }>;
  models: Array<{
    id: string;
    provider: string;
    label: string;
    description: string;
  }>;
  current: AiCurrentConfig;
}

export interface FsEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
}

export interface FsStat {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  modified: string;
  created: string;
}

export interface CommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  truncated: boolean;
}
