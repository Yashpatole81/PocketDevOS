/**
 * API client for communicating with the PocketDevOS server.
 * Replaces Tauri's invoke() calls.
 *
 * Auth token handling:
 * - Token is extracted from URL query param on first load via initAuth()
 * - Stored in a module-level variable (never in localStorage/cookies)
 * - Included as Bearer header in all API requests
 * - Included as query param in WebSocket connections
 * - On 401 response: sets auth error state and disables further API calls
 */

const BASE_URL = "";

// ─── Auth State (in-memory only, never persisted) ───────────────────────────

/** Auth token stored in memory only. Never persisted to localStorage/cookies. */
let authToken: string | null = null;

/** Whether a 401 has been received, disabling further API calls. */
let authError: boolean = false;

/** Optional callback invoked when auth error state changes. */
let authErrorCallback: ((error: boolean, message?: string) => void) | null = null;

// ─── Auth Public API ────────────────────────────────────────────────────────

/**
 * Initialize authentication by extracting the token from the URL query parameter.
 * Stores the token in memory and removes it from the URL without triggering a page reload.
 * Must be called once on app startup.
 */
export function initAuth(): void {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");

  if (token) {
    authToken = token;
    // Remove token from URL without reload
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.toString());
  }
}

/**
 * Set the auth token directly (for programmatic use).
 * Clears any existing auth error state.
 */
export function setAuthToken(token: string): void {
  authToken = token;
  authError = false;
}

/**
 * Get the current auth token (read-only access).
 */
export function getAuthToken(): string | null {
  return authToken;
}

/**
 * Check whether the client is in an auth error state (401 received).
 */
export function isAuthError(): boolean {
  return authError;
}

/**
 * Register a callback to be notified when auth error state changes.
 * Used by UI components to display auth error messages.
 */
export function onAuthError(callback: (error: boolean, message?: string) => void): void {
  authErrorCallback = callback;
}

/**
 * Clear auth error state (e.g., when a new token is provided).
 */
export function clearAuthError(): void {
  authError = false;
  if (authErrorCallback) {
    authErrorCallback(false);
  }
}

// ─── Internal Auth Helpers ──────────────────────────────────────────────────

function setAuthErrorState(message?: string): void {
  authError = true;
  if (authErrorCallback) {
    authErrorCallback(true, message);
  }
}

// ─── Request Function ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Block API calls if in auth error state
  if (authError) {
    throw new Error("Authentication error: API calls are disabled. Please provide a new token.");
  }

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

  // Handle 401: set auth error state and disable further calls
  if (response.status === 401) {
    setAuthErrorState("Authentication failed. Please re-authenticate with a valid token.");
    throw new Error("Authentication error: HTTP 401 Unauthorized");
  }

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
    // Block API calls if in auth error state
    if (authError) {
      return Promise.reject(new Error("Authentication error: API calls are disabled. Please provide a new token."));
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    return fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages, sessionId }),
      signal,
    }).then((response) => {
      if (response.status === 401) {
        setAuthErrorState("Authentication failed. Please re-authenticate with a valid token.");
        throw new Error("Authentication error: HTTP 401 Unauthorized");
      }
      return response;
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
