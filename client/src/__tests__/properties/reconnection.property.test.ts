/**
 * Property-based tests for action queue replay on reconnection.
 *
 * Property 17: Action queue replay on reconnection
 * - Generate arbitrary sequences of user actions queued during disconnect
 * - Assert: all actions replayed in original order, no loss, no duplication
 *
 * **Validates: Requirements 13.5**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { ActionQueue } from "../../lib/reconnect";
import { arbNanoidSessionId } from "./helpers";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary unique action ID */
const arbActionId = arbNanoidSessionId;

/** Arbitrary array of unique action IDs (simulates a sequence of distinct user actions) */
const arbUniqueActionIds = fc.uniqueArray(arbActionId, {
  minLength: 0,
  maxLength: 50,
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Feature: ai-first-workspace-redesign, Property 17: Action queue replay on reconnection", () => {
  it("after enqueueing N unique actions, queue size equals N", () => {
    fc.assert(
      fc.property(arbUniqueActionIds, (ids) => {
        const queue = new ActionQueue();

        for (const id of ids) {
          queue.enqueue({ id, execute: () => {} });
        }

        expect(queue.size).toBe(ids.length);
      }),
      { numRuns: 100 }
    );
  });

  it("after replay, all actions executed in original order", async () => {
    await fc.assert(
      fc.asyncProperty(arbUniqueActionIds, async (ids) => {
        const queue = new ActionQueue();
        const executionOrder: string[] = [];

        for (const id of ids) {
          queue.enqueue({
            id,
            execute: () => {
              executionOrder.push(id);
            },
          });
        }

        await queue.replay();

        expect(executionOrder).toEqual(ids);
      }),
      { numRuns: 100 }
    );
  });

  it("after replay, queue is empty (size === 0)", async () => {
    await fc.assert(
      fc.asyncProperty(arbUniqueActionIds, async (ids) => {
        const queue = new ActionQueue();

        for (const id of ids) {
          queue.enqueue({ id, execute: () => {} });
        }

        await queue.replay();

        expect(queue.size).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it("duplicate ids are ignored (enqueue same id twice, size stays at 1)", () => {
    fc.assert(
      fc.property(arbActionId, (id) => {
        const queue = new ActionQueue();

        queue.enqueue({ id, execute: () => {} });
        queue.enqueue({ id, execute: () => {} });

        expect(queue.size).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  it("no action is executed more than once during replay", async () => {
    await fc.assert(
      fc.asyncProperty(arbUniqueActionIds, async (ids) => {
        const queue = new ActionQueue();
        const executionCounts = new Map<string, number>();

        for (const id of ids) {
          queue.enqueue({
            id,
            execute: () => {
              executionCounts.set(id, (executionCounts.get(id) ?? 0) + 1);
            },
          });
        }

        await queue.replay();

        for (const id of ids) {
          expect(executionCounts.get(id)).toBe(1);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("no actions are lost during replay (all enqueued actions are executed)", async () => {
    await fc.assert(
      fc.asyncProperty(arbUniqueActionIds, async (ids) => {
        const queue = new ActionQueue();
        const executed = new Set<string>();

        for (const id of ids) {
          queue.enqueue({
            id,
            execute: () => {
              executed.add(id);
            },
          });
        }

        await queue.replay();

        for (const id of ids) {
          expect(executed.has(id)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
