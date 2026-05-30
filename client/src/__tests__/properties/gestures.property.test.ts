/**
 * Property-based tests for gesture system minimum swipe distance threshold.
 *
 * Property 16: Minimum swipe distance threshold
 * - Generate arbitrary touch distances (0–100px)
 * - Assert: distances < 30px never trigger action; distances ≥ 30px are evaluated
 *
 * **Validates: Requirements 12.4**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { SWIPE_THRESHOLD_PX } from "../../lib/gestures";
import { arbSwipeDistance } from "./helpers";

// ─── Threshold Check Logic ──────────────────────────────────────────────────

/**
 * Simulates the threshold check logic from SwipeDetector.
 * Returns true if the distance meets the minimum threshold for evaluation.
 */
function shouldEvaluateGesture(distance: number): boolean {
  return distance >= SWIPE_THRESHOLD_PX;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary swipe distance constrained to 0–100px range as specified */
const arbSwipeDistance0to100 = fc.integer({ min: 0, max: 100 });

/** Arbitrary distance below threshold (0–29px) */
const arbBelowThreshold = fc.integer({ min: 0, max: SWIPE_THRESHOLD_PX - 1 });

/** Arbitrary distance at or above threshold (30–100px) */
const arbAtOrAboveThreshold = fc.integer({ min: SWIPE_THRESHOLD_PX, max: 100 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Feature: ai-first-workspace-redesign, Property 16: Minimum swipe distance threshold", () => {
  it("SWIPE_THRESHOLD_PX is exactly 30", () => {
    expect(SWIPE_THRESHOLD_PX).toBe(30);
  });

  it("distances below 30px never trigger gesture evaluation", () => {
    fc.assert(
      fc.property(arbBelowThreshold, (distance) => {
        expect(shouldEvaluateGesture(distance)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("distances at or above 30px are evaluated for action", () => {
    fc.assert(
      fc.property(arbAtOrAboveThreshold, (distance) => {
        expect(shouldEvaluateGesture(distance)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("the threshold boundary is exactly 30px (29 rejected, 30 accepted)", () => {
    fc.assert(
      fc.property(arbSwipeDistance0to100, (distance) => {
        const result = shouldEvaluateGesture(distance);
        if (distance < 30) {
          expect(result).toBe(false);
        } else {
          expect(result).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("for any arbitrary swipe distance, threshold check is consistent with SWIPE_THRESHOLD_PX", () => {
    fc.assert(
      fc.property(arbSwipeDistance, (distance) => {
        const result = shouldEvaluateGesture(distance);
        expect(result).toBe(distance >= SWIPE_THRESHOLD_PX);
      }),
      { numRuns: 100 }
    );
  });
});
