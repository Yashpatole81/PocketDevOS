/**
 * Smoke test to verify property-based testing infrastructure is working.
 * This file can be removed once real property tests are in place.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { arbTimestamp, arbSessionId, arbFilePath } from "./helpers";

describe("Property test infrastructure", () => {
  it("fast-check is operational with custom arbitraries", () => {
    fc.assert(
      fc.property(arbTimestamp, (timestamp) => {
        expect(timestamp).toBeGreaterThan(0);
        expect(Number.isInteger(timestamp)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("session ID arbitrary produces non-empty strings", () => {
    fc.assert(
      fc.property(arbSessionId, (id) => {
        expect(id.trim().length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it("file path arbitrary produces valid paths with extensions", () => {
    fc.assert(
      fc.property(arbFilePath, (path) => {
        expect(path).toContain("/");
        expect(path).toContain(".");
      }),
      { numRuns: 100 }
    );
  });
});
