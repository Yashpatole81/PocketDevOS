import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { matchShortcut } from "./shortcuts";

// Mock the navigation store before importing the module under test
const mockOpenCommandPalette = vi.fn();
const mockCloseCommandPalette = vi.fn();
let mockCommandPaletteOpen = false;

vi.mock("@/store/navigationStore", () => ({
  useNavigationStore: {
    getState: () => ({
      commandPaletteOpen: mockCommandPaletteOpen,
      openCommandPalette: mockOpenCommandPalette,
      closeCommandPalette: mockCloseCommandPalette,
    }),
  },
}));

// Mock document.addEventListener/removeEventListener for the global shortcuts
type EventHandler = (e: unknown) => void;
const captureListeners: Record<string, EventHandler[]> = {};

const originalAddEventListener = globalThis.document?.addEventListener;
const originalRemoveEventListener = globalThis.document?.removeEventListener;

// Set up document mock before importing registerGlobalShortcuts
Object.defineProperty(globalThis, "document", {
  value: {
    addEventListener(type: string, handler: EventHandler, capture?: boolean) {
      if (capture) {
        if (!captureListeners[type]) captureListeners[type] = [];
        captureListeners[type].push(handler);
      }
    },
    removeEventListener(type: string, handler: EventHandler, capture?: boolean) {
      if (capture && captureListeners[type]) {
        captureListeners[type] = captureListeners[type].filter((h) => h !== handler);
      }
    },
    dispatchEvent(e: unknown) {
      const event = e as { type: string };
      const handlers = captureListeners[event.type] || [];
      handlers.forEach((h) => h(e));
    },
  },
  writable: true,
  configurable: true,
});

// Now import the functions that use document
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from "./shortcuts";

function createKeyboardEvent(
  key: string,
  opts: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}
): Record<string, unknown> & { preventDefault: () => void; stopPropagation: () => void } {
  return {
    type: "keydown",
    key,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

describe("matchShortcut", () => {
  it("matches Ctrl+K for command palette", () => {
    const e = createKeyboardEvent("k", { ctrlKey: true });
    const result = matchShortcut(e as unknown as KeyboardEvent);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("command-palette");
  });

  it("matches Cmd+K (metaKey) for command palette", () => {
    const e = createKeyboardEvent("k", { metaKey: true });
    const result = matchShortcut(e as unknown as KeyboardEvent);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("command-palette");
  });

  it("does not match plain K without modifier", () => {
    const e = createKeyboardEvent("k");
    const result = matchShortcut(e as unknown as KeyboardEvent);
    expect(result).toBeNull();
  });

  it("matches Ctrl+B for toggle sidebar", () => {
    const e = createKeyboardEvent("b", { ctrlKey: true });
    const result = matchShortcut(e as unknown as KeyboardEvent);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("toggle-sidebar");
  });

  it("does not match Ctrl+Shift+K (shift not expected)", () => {
    const e = createKeyboardEvent("k", { ctrlKey: true, shiftKey: true });
    const result = matchShortcut(e as unknown as KeyboardEvent);
    expect(result).toBeNull();
  });
});

describe("registerGlobalShortcuts / unregisterGlobalShortcuts", () => {
  beforeEach(() => {
    // Clear any registered listeners
    unregisterGlobalShortcuts();
    // Clear capture listeners manually
    for (const key of Object.keys(captureListeners)) {
      captureListeners[key] = [];
    }
    mockCommandPaletteOpen = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    unregisterGlobalShortcuts();
  });

  it("opens command palette on Ctrl+K", () => {
    registerGlobalShortcuts();

    const e = createKeyboardEvent("k", { ctrlKey: true });
    (globalThis.document as any).dispatchEvent(e);

    expect(mockOpenCommandPalette).toHaveBeenCalledTimes(1);
  });

  it("closes command palette on Ctrl+K when already open", () => {
    registerGlobalShortcuts();
    mockCommandPaletteOpen = true;

    const e = createKeyboardEvent("k", { ctrlKey: true });
    (globalThis.document as any).dispatchEvent(e);

    expect(mockCloseCommandPalette).toHaveBeenCalledTimes(1);
  });

  it("prevents default and stops propagation (CodeMirror conflict prevention)", () => {
    registerGlobalShortcuts();

    const e = createKeyboardEvent("k", { ctrlKey: true });
    (globalThis.document as any).dispatchEvent(e);

    expect(e.preventDefault).toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
  });

  it("does not fire after unregister", () => {
    registerGlobalShortcuts();
    unregisterGlobalShortcuts();

    const e = createKeyboardEvent("k", { ctrlKey: true });
    (globalThis.document as any).dispatchEvent(e);

    expect(mockOpenCommandPalette).not.toHaveBeenCalled();
  });

  it("is idempotent — multiple register calls only add one listener", () => {
    registerGlobalShortcuts();
    registerGlobalShortcuts();
    registerGlobalShortcuts();

    const e = createKeyboardEvent("k", { ctrlKey: true });
    (globalThis.document as any).dispatchEvent(e);

    expect(mockOpenCommandPalette).toHaveBeenCalledTimes(1);
  });

  it("works with Cmd+K (macOS)", () => {
    registerGlobalShortcuts();

    const e = createKeyboardEvent("k", { metaKey: true });
    (globalThis.document as any).dispatchEvent(e);

    expect(mockOpenCommandPalette).toHaveBeenCalledTimes(1);
  });

  it("ignores non-K keys with Ctrl", () => {
    registerGlobalShortcuts();

    const e = createKeyboardEvent("j", { ctrlKey: true });
    (globalThis.document as any).dispatchEvent(e);

    expect(mockOpenCommandPalette).not.toHaveBeenCalled();
    expect(mockCloseCommandPalette).not.toHaveBeenCalled();
  });

  it("ignores K without any modifier", () => {
    registerGlobalShortcuts();

    const e = createKeyboardEvent("k");
    (globalThis.document as any).dispatchEvent(e);

    expect(mockOpenCommandPalette).not.toHaveBeenCalled();
  });
});
