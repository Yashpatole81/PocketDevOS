/**
 * Property-based tests for editor utilities.
 *
 * Tests font size clamping and file extension to language mode mapping.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getLanguageMode, clampFontSize } from "../../lib/workspace-utils";
import {
  arbScaleFactor,
  arbFontSize,
  arbFilePathWithKnownExtension,
  arbFilePathWithUnknownExtension,
} from "./helpers";

describe("Feature: ai-first-workspace-redesign, Property 12: File extension to language mode mapping", () => {
  /**
   * **Validates: Requirements 8.2**
   *
   * For any file path with a recognized extension, getLanguageMode returns
   * the correct CodeMirror language mode. For unrecognized extensions, it
   * returns 'plaintext'.
   */
  it("returns a valid language mode for known extensions", () => {
    const knownExtensionToMode: Record<string, string> = {
      ".js": "javascript",
      ".jsx": "javascript",
      ".ts": "typescript",
      ".tsx": "typescript",
      ".py": "python",
      ".css": "css",
      ".html": "html",
      ".json": "json",
      ".md": "markdown",
    };

    fc.assert(
      fc.property(arbFilePathWithKnownExtension, (filePath) => {
        const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
        const result = getLanguageMode(filePath);

        if (ext in knownExtensionToMode) {
          expect(result).toBe(knownExtensionToMode[ext]);
        } else {
          // Extensions in helpers that aren't in the map should return plaintext
          expect(result).toBe("plaintext");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("returns plaintext for unrecognized extensions", () => {
    fc.assert(
      fc.property(arbFilePathWithUnknownExtension, (filePath) => {
        const result = getLanguageMode(filePath);
        expect(result).toBe("plaintext");
      }),
      { numRuns: 100 }
    );
  });
});

describe("Feature: ai-first-workspace-redesign, Property 13: Font size clamping on zoom", () => {
  /**
   * **Validates: Requirements 8.6**
   *
   * For any pinch-to-zoom scale factor applied to the editor, the resulting
   * font size is always clamped to the range [10, 24] inclusive.
   */
  it("result is always within [10, 24] inclusive for arbitrary scale and font size", () => {
    fc.assert(
      fc.property(arbScaleFactor, arbFontSize, (scale, currentFontSize) => {
        const result = clampFontSize(scale, currentFontSize);
        expect(result).toBeGreaterThanOrEqual(10);
        expect(result).toBeLessThanOrEqual(24);
      }),
      { numRuns: 100 }
    );
  });

  it("preserves the computed value when it falls within bounds", () => {
    fc.assert(
      fc.property(arbScaleFactor, arbFontSize, (scale, currentFontSize) => {
        const raw = currentFontSize * scale;
        const result = clampFontSize(scale, currentFontSize);

        if (raw >= 10 && raw <= 24) {
          expect(result).toBeCloseTo(raw, 10);
        } else if (raw < 10) {
          expect(result).toBe(10);
        } else {
          expect(result).toBe(24);
        }
      }),
      { numRuns: 100 }
    );
  });
});
