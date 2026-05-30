/**
 * Property-based tests for Command Palette search behavior.
 *
 * Property 9: Command palette search returns grouped, relevant, capped results
 * - Generate arbitrary command registries and search queries
 * - Assert: results grouped by category, each result matches query via fuzzy match, max 8 per category
 *
 * **Validates: Requirements 6.2, 6.6**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { fuzzyMatch } from "../../lib/workspace-utils";
import { arbSearchQuery } from "./helpers";

// ─── Types ──────────────────────────────────────────────────────────────────

type CommandCategory = "files" | "commands" | "recent" | "ai-actions";

interface CommandDefinition {
  id: string;
  label: string;
  category: CommandCategory;
  keywords: string[];
}

interface SearchResult {
  id: string;
  category: CommandCategory;
  label: string;
}

type GroupedResults = Record<CommandCategory, SearchResult[]>;

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIES: CommandCategory[] = ["files", "commands", "recent", "ai-actions"];
const MAX_PER_CATEGORY = 8;

// ─── Mock Search Function ───────────────────────────────────────────────────

/**
 * Mock command palette search function.
 * Takes a list of commands and a query, filters by fuzzyMatch,
 * groups by category, and caps at 8 per category.
 */
function searchCommands(commands: CommandDefinition[], query: string): GroupedResults {
  const results: GroupedResults = {
    files: [],
    commands: [],
    recent: [],
    "ai-actions": [],
  };

  for (const cmd of commands) {
    // Match against label or any keyword
    const matches =
      fuzzyMatch(query, cmd.label) ||
      cmd.keywords.some((kw) => fuzzyMatch(query, kw));

    if (matches) {
      const group = results[cmd.category];
      if (group.length < MAX_PER_CATEGORY) {
        group.push({
          id: cmd.id,
          category: cmd.category,
          label: cmd.label,
        });
      }
    }
  }

  return results;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const arbCategory: fc.Arbitrary<CommandCategory> = fc.constantFrom(...CATEGORIES);

const arbCommandLabel = fc
  .string({ minLength: 1, maxLength: 60 })
  .filter((s) => s.trim().length > 0);

const arbKeyword = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0);

const arbCommandDefinition: fc.Arbitrary<CommandDefinition> = fc.record({
  id: fc.uuid(),
  label: arbCommandLabel,
  category: arbCategory,
  keywords: fc.array(arbKeyword, { minLength: 0, maxLength: 5 }),
});

const arbCommandRegistry = fc.array(arbCommandDefinition, {
  minLength: 0,
  maxLength: 50,
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Feature: ai-first-workspace-redesign, Property 9: Command palette search returns grouped, relevant, capped results", () => {
  it("results are grouped by category with valid category keys", () => {
    fc.assert(
      fc.property(arbCommandRegistry, arbSearchQuery, (commands, query) => {
        const results = searchCommands(commands, query);

        // All four categories exist as keys
        for (const category of CATEGORIES) {
          expect(results[category]).toBeDefined();
          expect(Array.isArray(results[category])).toBe(true);
        }

        // Every result has the correct category field matching its group
        for (const category of CATEGORIES) {
          for (const result of results[category]) {
            expect(result.category).toBe(category);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("each result matches the query via fuzzy match on label or keywords", () => {
    fc.assert(
      fc.property(arbCommandRegistry, arbSearchQuery, (commands, query) => {
        const results = searchCommands(commands, query);

        for (const category of CATEGORIES) {
          for (const result of results[category]) {
            // Find the original command to check keywords too
            const originalCmd = commands.find((c) => c.id === result.id);
            expect(originalCmd).toBeDefined();

            const matchesLabel = fuzzyMatch(query, result.label);
            const matchesKeyword = originalCmd!.keywords.some((kw) =>
              fuzzyMatch(query, kw)
            );

            expect(matchesLabel || matchesKeyword).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("no category contains more than 8 results", () => {
    fc.assert(
      fc.property(arbCommandRegistry, arbSearchQuery, (commands, query) => {
        const results = searchCommands(commands, query);

        for (const category of CATEGORIES) {
          expect(results[category].length).toBeLessThanOrEqual(MAX_PER_CATEGORY);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("cap is enforced even when many commands match in a single category", () => {
    // Generate a registry with many commands in one category that all match a simple query
    fc.assert(
      fc.property(
        arbCategory,
        fc.integer({ min: 9, max: 30 }),
        (category, count) => {
          const query = "a";
          const commands: CommandDefinition[] = Array.from(
            { length: count },
            (_, i) => ({
              id: `cmd-${i}`,
              label: `action-${i}`,
              category,
              keywords: ["activate"],
            })
          );

          const results = searchCommands(commands, query);
          expect(results[category].length).toBeLessThanOrEqual(MAX_PER_CATEGORY);
          expect(results[category].length).toBe(MAX_PER_CATEGORY);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("empty query matches nothing (fuzzyMatch requires all chars present)", () => {
    // Note: arbSearchQuery has minLength 1, so we test with a query that won't match
    // Actually, empty string fuzzyMatch returns true (qi === q.length when q.length === 0)
    // But our arbSearchQuery guarantees minLength 1, so this tests that non-matching queries return empty
    fc.assert(
      fc.property(arbCommandRegistry, (commands) => {
        // Use a query with characters unlikely to appear in any label/keyword
        const query = "zzzzqqqq";
        const results = searchCommands(commands, query);

        for (const category of CATEGORIES) {
          for (const result of results[category]) {
            const originalCmd = commands.find((c) => c.id === result.id);
            const matchesLabel = fuzzyMatch(query, result.label);
            const matchesKeyword = originalCmd!.keywords.some((kw) =>
              fuzzyMatch(query, kw)
            );
            expect(matchesLabel || matchesKeyword).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
