/**
 * Property-based tests for the Panel System.
 *
 * Tests correctness properties of panel layout persistence and dimension enforcement.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { usePanelStore } from "../../store/panelStore";
import { arbPanelConfigArray, arbPanelId } from "./helpers";

// ─── localStorage Mock ──────────────────────────────────────────────────────

const STORAGE_KEY = "pocketdevos-panel-layout";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// ─── Property 7: Panel layout persistence round-trip ────────────────────────

describe("Feature: ai-first-workspace-redesign, Property 7: Panel layout persistence round-trip", () => {
  beforeEach(() => {
    localStorageMock.clear();
    usePanelStore.setState({ panels: [], sidebarCollapsed: false });
  });

  /**
   * **Validates: Requirements 5.4**
   *
   * For any valid panel configuration array, serializing to localStorage
   * and deserializing SHALL produce a configuration equivalent to the original.
   */
  it("serializing panel config to localStorage and deserializing produces equivalent config", () => {
    fc.assert(
      fc.property(arbPanelConfigArray, (panelConfigs) => {
        // Arrange: set panels in the store
        const store = usePanelStore.getState();
        store.setPanels(panelConfigs);

        // Act: persist to localStorage
        usePanelStore.getState().persistLayout();

        // Verify data was written to localStorage
        const raw = localStorageMock.getItem(STORAGE_KEY);
        expect(raw).not.toBeNull();

        // Reset the store to empty state
        usePanelStore.setState({ panels: [], sidebarCollapsed: false });

        // Act: restore from localStorage
        usePanelStore.getState().restoreLayout();

        // Assert: deserialized config equals original
        const restored = usePanelStore.getState().panels;
        expect(restored).toEqual(panelConfigs);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 8: Panel minimum dimension enforcement ────────────────────────

describe("Feature: ai-first-workspace-redesign, Property 8: Panel minimum dimension enforcement", () => {
  beforeEach(() => {
    // Reset the store to default state before each test
    usePanelStore.setState({
      panels: [
        { id: "ai", position: "left", width: 400, visible: true, order: 0 },
        { id: "editor", position: "right", width: 600, visible: true, order: 1 },
        { id: "terminal", position: "bottom", height: 250, visible: true, order: 2 },
        { id: "files", position: "left", width: 240, visible: false, order: 3 },
        { id: "git", position: "right", width: 300, visible: false, order: 4 },
        { id: "logs", position: "bottom", height: 200, visible: false, order: 5 },
        { id: "preview", position: "right", width: 500, visible: false, order: 6 },
        { id: "search", position: "left", width: 300, visible: false, order: 7 },
      ],
      sidebarCollapsed: false,
    });
  });

  /**
   * **Validates: Requirements 5.5**
   *
   * For any resize operation on a panel, the resulting width SHALL be at least 200px
   * and the resulting height SHALL be at least 120px, regardless of the requested dimensions.
   */
  it("resizePanel always enforces minimum width of 200px", () => {
    fc.assert(
      fc.property(
        arbPanelId,
        fc.integer({ min: -1000, max: 5000 }),
        (panelId, requestedWidth) => {
          const { resizePanel } = usePanelStore.getState();
          resizePanel(panelId, requestedWidth, undefined);

          const panel = usePanelStore.getState().panels.find((p) => p.id === panelId);
          expect(panel).toBeDefined();
          if (panel?.width !== undefined) {
            expect(panel.width).toBeGreaterThanOrEqual(200);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("resizePanel always enforces minimum height of 120px", () => {
    fc.assert(
      fc.property(
        arbPanelId,
        fc.integer({ min: -1000, max: 5000 }),
        (panelId, requestedHeight) => {
          const { resizePanel } = usePanelStore.getState();
          resizePanel(panelId, undefined, requestedHeight);

          const panel = usePanelStore.getState().panels.find((p) => p.id === panelId);
          expect(panel).toBeDefined();
          if (panel?.height !== undefined) {
            expect(panel.height).toBeGreaterThanOrEqual(120);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("resizePanel enforces both minimum width and height simultaneously", () => {
    fc.assert(
      fc.property(
        arbPanelId,
        fc.integer({ min: -1000, max: 5000 }),
        fc.integer({ min: -1000, max: 5000 }),
        (panelId, requestedWidth, requestedHeight) => {
          const { resizePanel } = usePanelStore.getState();
          resizePanel(panelId, requestedWidth, requestedHeight);

          const panel = usePanelStore.getState().panels.find((p) => p.id === panelId);
          expect(panel).toBeDefined();
          if (panel?.width !== undefined) {
            expect(panel.width).toBeGreaterThanOrEqual(200);
          }
          if (panel?.height !== undefined) {
            expect(panel.height).toBeGreaterThanOrEqual(120);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
