/**
 * Property-based tests for terminal functionality.
 *
 * Tests pinned session persistence and reconnection backoff logic.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { ExponentialBackoff } from "../../lib/reconnect";
import { useTerminalStore } from "../../store/terminalStore";
import { arbBaseDelay, arbTerminalSession } from "./helpers";

// ─── localStorage mock ──────────────────────────────────────────────────────

const PINNED_SESSIONS_KEY = "pocketdevos:pinned-sessions";

let storage: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    storage = {};
  },
  get length() {
    return Object.keys(storage).length;
  },
  key: (index: number) => Object.keys(storage)[index] ?? null,
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Feature: ai-first-workspace-redesign, Property 10: Pinned terminal session persistence round-trip", () => {
  /**
   * **Validates: Requirements 7.4**
   *
   * For any set of pinned terminal session metadata (id, label, pinned flag),
   * serializing to localStorage and deserializing SHALL produce metadata
   * equivalent to the original.
   */

  beforeEach(() => {
    storage = {};
    useTerminalStore.setState({
      sessions: [],
      activeSessionId: null,
      recentCommands: [],
    });
  });

  it("pinned terminal sessions survive a persist → restore round-trip", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(arbTerminalSession, {
          minLength: 1,
          maxLength: 10,
          selector: (s) => s.id,
        }),
        (sessions) => {
          // Arrange: reset state
          useTerminalStore.setState({ sessions: [], activeSessionId: null, recentCommands: [] });
          storage = {};

          // Add sessions to the store and pin them all
          for (const session of sessions) {
            useTerminalStore.getState().addSession(session);
          }
          for (const session of sessions) {
            useTerminalStore.getState().pinSession(session.id);
          }

          // Act: persist pinned sessions to localStorage
          useTerminalStore.getState().persistPinnedSessions();

          // Verify something was written
          const raw = localStorage.getItem(PINNED_SESSIONS_KEY);
          expect(raw).not.toBeNull();

          // Clear the store to simulate app restart
          useTerminalStore.setState({ sessions: [], activeSessionId: null, recentCommands: [] });

          // Act: restore pinned sessions from localStorage
          useTerminalStore.getState().restorePinnedSessions();

          // Assert: restored sessions match the original pinned sessions
          const restored = useTerminalStore.getState().sessions;
          expect(restored.length).toBe(sessions.length);

          for (const original of sessions) {
            const found = restored.find((r) => r.id === original.id);
            expect(found).toBeDefined();
            expect(found!.id).toBe(original.id);
            expect(found!.label).toBe(original.label);
            expect(found!.pinned).toBe(true);
            expect(found!.status).toBe(original.status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("only pinned sessions are persisted (non-pinned sessions are excluded)", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(arbTerminalSession, {
          minLength: 1,
          maxLength: 10,
          selector: (s) => s.id,
        }),
        (sessions) => {
          // Arrange: reset state
          useTerminalStore.setState({ sessions: [], activeSessionId: null, recentCommands: [] });
          storage = {};

          // Add sessions with their generated pinned states (mixed)
          for (const session of sessions) {
            useTerminalStore.getState().addSession(session);
          }

          // Act: persist (uses the pinned flag as-is from generated sessions)
          useTerminalStore.getState().persistPinnedSessions();

          // Clear store to simulate restart
          useTerminalStore.setState({ sessions: [], activeSessionId: null, recentCommands: [] });

          // Restore
          useTerminalStore.getState().restorePinnedSessions();

          // Assert: only originally-pinned sessions are restored
          const restored = useTerminalStore.getState().sessions;
          const expectedPinned = sessions.filter((s) => s.pinned);

          expect(restored.length).toBe(expectedPinned.length);

          for (const expected of expectedPinned) {
            const found = restored.find((r) => r.id === expected.id);
            expect(found).toBeDefined();
            expect(found!.id).toBe(expected.id);
            expect(found!.label).toBe(expected.label);
            expect(found!.pinned).toBe(true);
            expect(found!.status).toBe(expected.status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: ai-first-workspace-redesign, Property 11: Terminal reconnection exponential backoff", () => {
  /**
   * **Validates: Requirements 7.6**
   *
   * For any WebSocket disconnect event, the reconnection logic SHALL attempt
   * retries with exponentially increasing delays (base × 2^attempt) and SHALL
   * stop after exactly 3 retry attempts.
   */
  it("delays follow base × 2^attempt pattern for all attempts", () => {
    fc.assert(
      fc.property(
        arbBaseDelay,
        fc.integer({ min: 0, max: 2 }),
        (baseDelay, attempt) => {
          const backoff = new ExponentialBackoff(baseDelay, 3);
          const delay = backoff.getDelay(attempt);
          const expected = baseDelay * Math.pow(2, attempt);
          expect(delay).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("stops retrying after exactly 3 attempts", () => {
    fc.assert(
      fc.property(arbBaseDelay, (baseDelay) => {
        const backoff = new ExponentialBackoff(baseDelay, 3);

        // Attempts 0, 1, 2 should allow retry
        expect(backoff.shouldRetry(0)).toBe(true);
        expect(backoff.shouldRetry(1)).toBe(true);
        expect(backoff.shouldRetry(2)).toBe(true);

        // Attempt 3 and beyond should NOT retry
        expect(backoff.shouldRetry(3)).toBe(false);
        expect(backoff.shouldRetry(4)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("delays increase exponentially across consecutive attempts", () => {
    fc.assert(
      fc.property(arbBaseDelay, (baseDelay) => {
        const backoff = new ExponentialBackoff(baseDelay, 3);

        const delay0 = backoff.getDelay(0);
        const delay1 = backoff.getDelay(1);
        const delay2 = backoff.getDelay(2);

        // Each delay should be exactly double the previous
        expect(delay1).toBe(delay0 * 2);
        expect(delay2).toBe(delay1 * 2);

        // Verify absolute values
        expect(delay0).toBe(baseDelay);
        expect(delay1).toBe(baseDelay * 2);
        expect(delay2).toBe(baseDelay * 4);
      }),
      { numRuns: 100 }
    );
  });

  it("shouldRetry returns true for exactly 3 attempts (0, 1, 2) regardless of base delay", () => {
    fc.assert(
      fc.property(arbBaseDelay, (baseDelay) => {
        const backoff = new ExponentialBackoff(baseDelay, 3);

        // Count how many attempts are allowed
        let retryCount = 0;
        for (let attempt = 0; attempt < 10; attempt++) {
          if (backoff.shouldRetry(attempt)) {
            retryCount++;
          }
        }

        expect(retryCount).toBe(3);
      }),
      { numRuns: 100 }
    );
  });
});
