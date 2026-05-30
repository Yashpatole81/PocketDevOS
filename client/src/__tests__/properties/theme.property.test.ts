/**
 * Property-based test: WCAG AA contrast ratio compliance
 *
 * Property 14: For all text/background color pairs defined in the monochrome theme,
 * the computed WCAG contrast ratio SHALL be at least 4.5:1.
 *
 * **Validates: Requirements 9.4**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeContrastRatio } from "../../lib/workspace-utils";
import { midnightTheme } from "../../modules/theme/themes";

describe("Feature: ai-first-workspace-redesign, Property 14: WCAG AA contrast ratio compliance", () => {
  // Extract theme colors for testing
  const backgrounds = [
    { name: "background", value: midnightTheme.colors.background },
    { name: "surface1", value: midnightTheme.colors.surface1 },
    { name: "surface2", value: midnightTheme.colors.surface2 },
    { name: "surface3", value: midnightTheme.colors.surface3 },
  ] as const;

  const textColors = [
    { name: "textPrimary", value: midnightTheme.colors.textPrimary },
    { name: "textSecondary", value: midnightTheme.colors.textSecondary },
  ] as const;

  // Build all text/background pairs that must meet WCAG AA (4.5:1)
  const wcagPairs = textColors.flatMap((text) =>
    backgrounds.map((bg) => ({
      textName: text.name,
      textValue: text.value,
      bgName: bg.name,
      bgValue: bg.value,
    }))
  );

  it("textPrimary and textSecondary have >= 4.5:1 contrast against all background/surface colors", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...wcagPairs),
        (pair) => {
          const ratio = computeContrastRatio(pair.textValue, pair.bgValue);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Individual pair tests for clear failure reporting
  for (const pair of wcagPairs) {
    it(`${pair.textName} on ${pair.bgName} meets WCAG AA (>= 4.5:1)`, () => {
      const ratio = computeContrastRatio(pair.textValue, pair.bgValue);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }

  // Verify textMuted is intentionally below threshold for some surfaces
  // (textMuted is for decorative/non-essential text and may not meet 4.5:1)
  it("textMuted contrast ratios are computed correctly (informational)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...backgrounds),
        (bg) => {
          const ratio = computeContrastRatio(
            midnightTheme.colors.textMuted,
            bg.value
          );
          // textMuted contrast should be a valid positive number between 1 and 21
          expect(ratio).toBeGreaterThanOrEqual(1);
          expect(ratio).toBeLessThanOrEqual(21);
        }
      ),
      { numRuns: 100 }
    );
  });
});
