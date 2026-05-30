/**
 * Property-based tests for dashboard data selection.
 *
 * Property 1: Dashboard data selection returns top-N most recent items
 * - Generate arbitrary arrays of items with timestamps and statuses
 * - Assert: returned items are sorted descending by timestamp, length ≤ N, filtered items match allowed statuses
 *
 * **Validates: Requirements 1.2, 1.3, 1.4**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { selectTopN } from "../../lib/workspace-utils";
import { arbRealisticTimestamp } from "./helpers";

// ─── Test Item Type ─────────────────────────────────────────────────────────

interface TestItem {
  id: string;
  timestamp: number;
  status: "active" | "paused" | "completed" | "archived";
}

const ALL_STATUSES = ["active", "paused", "completed", "archived"] as const;

// ─── Arbitraries ────────────────────────────────────────────────────────────

const arbStatus = fc.constantFrom<TestItem["status"]>(...ALL_STATUSES);

const arbTestItem: fc.Arbitrary<TestItem> = fc.record({
  id: fc.uuid(),
  timestamp: arbRealisticTimestamp,
  status: arbStatus,
});

const arbTestItems = fc.array(arbTestItem, { minLength: 0, maxLength: 50 });

const arbN = fc.integer({ min: 0, max: 20 });

/** Arbitrary non-empty subset of statuses to use as an allowed filter */
const arbAllowedStatuses = fc
  .subarray([...ALL_STATUSES], { minLength: 1 })
  .filter((arr) => arr.length > 0);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Feature: ai-first-workspace-redesign, Property 1: Dashboard data selection returns top-N most recent items", () => {
  it("returned items are sorted descending by timestamp", () => {
    fc.assert(
      fc.property(arbTestItems, arbN, (items, n) => {
        const result = selectTopN(items, n, (item) => item.timestamp);

        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1].timestamp).toBeGreaterThanOrEqual(
            result[i].timestamp
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  it("returned length is at most N", () => {
    fc.assert(
      fc.property(arbTestItems, arbN, (items, n) => {
        const result = selectTopN(items, n, (item) => item.timestamp);
        expect(result.length).toBeLessThanOrEqual(n);
      }),
      { numRuns: 100 }
    );
  });

  it("returned length is min(N, available items) when no filter", () => {
    fc.assert(
      fc.property(arbTestItems, arbN, (items, n) => {
        const result = selectTopN(items, n, (item) => item.timestamp);
        expect(result.length).toBe(Math.min(n, items.length));
      }),
      { numRuns: 100 }
    );
  });

  it("filtered items match allowed statuses only", () => {
    fc.assert(
      fc.property(
        arbTestItems,
        arbN,
        arbAllowedStatuses,
        (items, n, allowedStatuses) => {
          const filterFn = (item: TestItem) =>
            allowedStatuses.includes(item.status);

          const result = selectTopN(
            items,
            n,
            (item) => item.timestamp,
            filterFn
          );

          for (const item of result) {
            expect(allowedStatuses).toContain(item.status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("filtered result length is at most min(N, count of matching items)", () => {
    fc.assert(
      fc.property(
        arbTestItems,
        arbN,
        arbAllowedStatuses,
        (items, n, allowedStatuses) => {
          const filterFn = (item: TestItem) =>
            allowedStatuses.includes(item.status);

          const matchingCount = items.filter(filterFn).length;
          const result = selectTopN(
            items,
            n,
            (item) => item.timestamp,
            filterFn
          );

          expect(result.length).toBe(Math.min(n, matchingCount));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("all returned items exist in the original input", () => {
    fc.assert(
      fc.property(arbTestItems, arbN, (items, n) => {
        const result = selectTopN(items, n, (item) => item.timestamp);

        for (const resultItem of result) {
          expect(items).toContainEqual(resultItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("no item outside the result has a more recent timestamp than any item in the result (without filter)", () => {
    fc.assert(
      fc.property(arbTestItems, arbN, (items, n) => {
        const result = selectTopN(items, n, (item) => item.timestamp);

        if (result.length === 0 || result.length === items.length) return;

        const minResultTimestamp = Math.min(
          ...result.map((item) => item.timestamp)
        );
        const excluded = items.filter((item) => !result.includes(item));

        for (const item of excluded) {
          expect(item.timestamp).toBeLessThanOrEqual(minResultTimestamp);
        }
      }),
      { numRuns: 100 }
    );
  });
});
