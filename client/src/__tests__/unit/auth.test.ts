/**
 * Unit tests for auth token handling in api.ts
 *
 * Tests:
 * - initAuth() extracts token from URL, stores in memory, removes from URL
 * - Bearer token included in API request headers
 * - Token included as query param in WebSocket connections
 * - 401 responses set auth error state and disable further API calls
 * - Token is never persisted to localStorage/cookies
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// We need to reset module state between tests
let api: typeof import("../../lib/api");

describe("Auth token handling", () => {
  const replaceStateMock = vi.fn();

  beforeEach(async () => {
    vi.resetModules();

    // Stub window globals for node environment
    vi.stubGlobal("window", {
      location: {
        href: "http://localhost:3000/",
        protocol: "http:",
        host: "localhost:3000",
        search: "",
      },
      history: {
        replaceState: replaceStateMock,
      },
    });

    // Stub fetch
    vi.stubGlobal("fetch", vi.fn());

    replaceStateMock.mockClear();

    api = await import("../../lib/api");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("initAuth()", () => {
    it("extracts token from URL query param and stores in memory", async () => {
      vi.resetModules();
      vi.stubGlobal("window", {
        location: {
          href: "http://localhost:3000/?token=my-secret-token",
          protocol: "http:",
          host: "localhost:3000",
          search: "?token=my-secret-token",
        },
        history: { replaceState: replaceStateMock },
      });
      vi.stubGlobal("fetch", vi.fn());

      api = await import("../../lib/api");
      api.initAuth();

      expect(api.getAuthToken()).toBe("my-secret-token");
    });

    it("removes token from URL via history.replaceState without reload", async () => {
      vi.resetModules();
      vi.stubGlobal("window", {
        location: {
          href: "http://localhost:3000/?token=abc123&other=param",
          protocol: "http:",
          host: "localhost:3000",
          search: "?token=abc123&other=param",
        },
        history: { replaceState: replaceStateMock },
      });
      vi.stubGlobal("fetch", vi.fn());

      api = await import("../../lib/api");
      api.initAuth();

      expect(replaceStateMock).toHaveBeenCalledWith(
        {},
        "",
        expect.not.stringContaining("token=abc123")
      );
    });

    it("preserves other query params when removing token", async () => {
      vi.resetModules();
      vi.stubGlobal("window", {
        location: {
          href: "http://localhost:3000/?token=abc123&other=param",
          protocol: "http:",
          host: "localhost:3000",
          search: "?token=abc123&other=param",
        },
        history: { replaceState: replaceStateMock },
      });
      vi.stubGlobal("fetch", vi.fn());

      api = await import("../../lib/api");
      api.initAuth();

      expect(replaceStateMock).toHaveBeenCalledWith(
        {},
        "",
        expect.stringContaining("other=param")
      );
    });

    it("does nothing when no token in URL", () => {
      api.initAuth();

      expect(api.getAuthToken()).toBeNull();
      expect(replaceStateMock).not.toHaveBeenCalled();
    });
  });

  describe("Bearer token in API requests", () => {
    it("includes Authorization header when token is set", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [] }),
      });
      vi.stubGlobal("fetch", fetchMock);

      api.setAuthToken("test-token-123");
      await api.fs.readdir("/");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token-123",
          }),
        })
      );
    });

    it("does not include Authorization header when no token", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [] }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await api.fs.readdir("/");

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].headers).not.toHaveProperty("Authorization");
    });
  });

  describe("WebSocket token as query param", () => {
    it("includes token as query param in WebSocket URL", () => {
      api.setAuthToken("ws-token-456");

      const MockWebSocket = vi.fn();
      vi.stubGlobal("WebSocket", MockWebSocket);

      api.terminal.connect("session-1");

      expect(MockWebSocket).toHaveBeenCalledWith(
        expect.stringContaining("?token=ws-token-456")
      );
    });

    it("does not include token param when no token", () => {
      const MockWebSocket = vi.fn();
      vi.stubGlobal("WebSocket", MockWebSocket);

      api.terminal.connect("session-1");

      const url = MockWebSocket.mock.calls[0][0] as string;
      expect(url).not.toContain("token=");
    });
  });

  describe("401 handling", () => {
    it("sets auth error state on 401 response", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      api.setAuthToken("expired-token");

      await expect(api.fs.readdir("/")).rejects.toThrow("Authentication error");
      expect(api.isAuthError()).toBe(true);
    });

    it("disables further API calls after 401", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      api.setAuthToken("expired-token");

      // First call triggers 401
      await expect(api.fs.readdir("/")).rejects.toThrow();

      // Subsequent calls are blocked without hitting the network
      fetchMock.mockClear();
      await expect(api.fs.readdir("/")).rejects.toThrow(
        "Authentication error: API calls are disabled"
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("calls auth error callback on 401", async () => {
      const callback = vi.fn();
      api.onAuthError(callback);

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      api.setAuthToken("expired-token");
      await expect(api.fs.readdir("/")).rejects.toThrow();

      expect(callback).toHaveBeenCalledWith(true, expect.any(String));
    });

    it("clears auth error when new token is set", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      api.setAuthToken("expired-token");
      await expect(api.fs.readdir("/")).rejects.toThrow();
      expect(api.isAuthError()).toBe(true);

      // Setting a new token clears the error
      api.setAuthToken("new-valid-token");
      expect(api.isAuthError()).toBe(false);
    });

    it("clearAuthError() resets error state and notifies callback", () => {
      const callback = vi.fn();
      api.onAuthError(callback);

      api.clearAuthError();
      expect(api.isAuthError()).toBe(false);
      expect(callback).toHaveBeenCalledWith(false);
    });
  });

  describe("Token never persisted to storage", () => {
    it("initAuth does not call localStorage.setItem", async () => {
      const setItemMock = vi.fn();
      vi.resetModules();
      vi.stubGlobal("window", {
        location: {
          href: "http://localhost:3000/?token=secret-token",
          protocol: "http:",
          host: "localhost:3000",
          search: "?token=secret-token",
        },
        history: { replaceState: replaceStateMock },
      });
      vi.stubGlobal("fetch", vi.fn());
      vi.stubGlobal("localStorage", {
        getItem: vi.fn(),
        setItem: setItemMock,
        removeItem: vi.fn(),
        clear: vi.fn(),
      });

      api = await import("../../lib/api");
      api.initAuth();

      // Verify localStorage.setItem was never called with the token
      for (const [, value] of setItemMock.mock.calls) {
        expect(String(value)).not.toContain("secret-token");
      }
    });

    it("setAuthToken does not persist to any storage", () => {
      const setItemMock = vi.fn();
      vi.stubGlobal("localStorage", {
        getItem: vi.fn(),
        setItem: setItemMock,
        removeItem: vi.fn(),
        clear: vi.fn(),
      });

      api.setAuthToken("memory-only-token");

      // localStorage should not have been called at all
      expect(setItemMock).not.toHaveBeenCalled();
    });
  });
});
