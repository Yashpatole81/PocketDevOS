/**
 * Unit tests for the useGestures React hook and SwipeDetector integration.
 *
 * Tests verify that SwipeDetector correctly detects gestures and invokes
 * the appropriate callbacks. The useGestures hook is a thin wrapper that
 * creates/destroys a SwipeDetector on mount/unmount.
 *
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.5**
 */
import { describe, it, expect, vi } from "vitest";
import { SwipeDetector, SWIPE_THRESHOLD_PX, LEFT_EDGE_ZONE_PX } from "./gestures";

// ─── Mock Element with Event Listener Tracking ──────────────────────────────

type EventHandler = (e: unknown) => void;

/**
 * Creates a minimal mock HTMLElement that tracks addEventListener/removeEventListener
 * and allows dispatching synthetic touch-like events.
 */
function createMockElement() {
  const listeners: Record<string, EventHandler[]> = {};

  const element = {
    addEventListener(type: string, handler: EventHandler, _options?: unknown) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    },
    removeEventListener(type: string, handler: EventHandler) {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((h) => h !== handler);
    },
    dispatch(type: string, event: unknown) {
      (listeners[type] || []).forEach((h) => h(event));
    },
    getListenerCount(type: string): number {
      return (listeners[type] || []).length;
    },
  };

  return element;
}

/**
 * Simulates a complete swipe gesture on a mock element.
 */
function simulateSwipe(
  element: ReturnType<typeof createMockElement>,
  startX: number,
  startY: number,
  endX: number,
  endY: number
) {
  element.dispatch("touchstart", {
    touches: [{ clientX: startX, clientY: startY }],
  });
  element.dispatch("touchmove", {
    touches: [{ clientX: endX, clientY: endY }],
  });
  element.dispatch("touchend", {
    touches: [],
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("useGestures hook integration (via SwipeDetector)", () => {
  it("should invoke onEdgeSwipeRight when swiping right from left edge", () => {
    const mockEl = createMockElement();
    const onEdgeSwipeRight = vi.fn();
    const detector = new SwipeDetector(mockEl as unknown as HTMLElement, { onEdgeSwipeRight });

    // Swipe from left edge (x=10, which is < LEFT_EDGE_ZONE_PX=20) to the right
    simulateSwipe(mockEl, 10, 100, 10 + SWIPE_THRESHOLD_PX + 10, 100);

    expect(onEdgeSwipeRight).toHaveBeenCalledTimes(1);
    detector.destroy();
  });

  it("should invoke onSwipeRight (not edge) when swiping right from non-edge", () => {
    const mockEl = createMockElement();
    const onSwipeRight = vi.fn();
    const onEdgeSwipeRight = vi.fn();
    const detector = new SwipeDetector(mockEl as unknown as HTMLElement, {
      onSwipeRight,
      onEdgeSwipeRight,
    });

    // Swipe from non-edge (x=100, which is > LEFT_EDGE_ZONE_PX=20)
    simulateSwipe(mockEl, 100, 100, 100 + SWIPE_THRESHOLD_PX + 10, 100);

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onEdgeSwipeRight).not.toHaveBeenCalled();
    detector.destroy();
  });

  it("should invoke onSwipeDown when swiping down", () => {
    const mockEl = createMockElement();
    const onSwipeDown = vi.fn();
    const detector = new SwipeDetector(mockEl as unknown as HTMLElement, { onSwipeDown });

    // Swipe down (y increases by more than threshold)
    simulateSwipe(mockEl, 100, 100, 100, 100 + SWIPE_THRESHOLD_PX + 10);

    expect(onSwipeDown).toHaveBeenCalledTimes(1);
    detector.destroy();
  });

  it("should invoke onSwipeLeft when swiping left", () => {
    const mockEl = createMockElement();
    const onSwipeLeft = vi.fn();
    const detector = new SwipeDetector(mockEl as unknown as HTMLElement, { onSwipeLeft });

    // Swipe left (x decreases by more than threshold)
    simulateSwipe(mockEl, 200, 100, 200 - SWIPE_THRESHOLD_PX - 10, 100);

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    detector.destroy();
  });

  it("should not trigger any callback for swipes below threshold", () => {
    const mockEl = createMockElement();
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const onSwipeDown = vi.fn();
    const onEdgeSwipeRight = vi.fn();

    const detector = new SwipeDetector(mockEl as unknown as HTMLElement, {
      onSwipeLeft,
      onSwipeRight,
      onSwipeDown,
      onEdgeSwipeRight,
    });

    // Swipe less than threshold (20px < 30px)
    simulateSwipe(mockEl, 100, 100, 120, 100);

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
    expect(onSwipeDown).not.toHaveBeenCalled();
    expect(onEdgeSwipeRight).not.toHaveBeenCalled();
    detector.destroy();
  });

  it("gesture detection is synchronous (supports 200ms animation budget)", () => {
    const mockEl = createMockElement();
    const onEdgeSwipeRight = vi.fn();
    const detector = new SwipeDetector(mockEl as unknown as HTMLElement, { onEdgeSwipeRight });

    const start = performance.now();
    simulateSwipe(mockEl, 5, 100, 5 + SWIPE_THRESHOLD_PX + 10, 100);
    const elapsed = performance.now() - start;

    // Gesture detection should complete in < 5ms (synchronous event handling)
    // The 200ms animation budget is for the CSS transition that follows the callback
    expect(elapsed).toBeLessThan(5);
    expect(onEdgeSwipeRight).toHaveBeenCalled();
    detector.destroy();
  });

  it("should clean up event listeners on destroy", () => {
    const mockEl = createMockElement();
    const onSwipeLeft = vi.fn();
    const detector = new SwipeDetector(mockEl as unknown as HTMLElement, { onSwipeLeft });

    // Verify listeners were added
    expect(mockEl.getListenerCount("touchstart")).toBe(1);
    expect(mockEl.getListenerCount("touchmove")).toBe(1);
    expect(mockEl.getListenerCount("touchend")).toBe(1);

    detector.destroy();

    // Verify listeners were removed
    expect(mockEl.getListenerCount("touchstart")).toBe(0);
    expect(mockEl.getListenerCount("touchmove")).toBe(0);
    expect(mockEl.getListenerCount("touchend")).toBe(0);

    // After destroy, swipes should not trigger callbacks
    simulateSwipe(mockEl, 200, 100, 200 - SWIPE_THRESHOLD_PX - 10, 100);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("left edge boundary is exactly LEFT_EDGE_ZONE_PX (20px)", () => {
    const mockEl = createMockElement();
    const onSwipeRight = vi.fn();
    const onEdgeSwipeRight = vi.fn();
    const detector = new SwipeDetector(mockEl as unknown as HTMLElement, {
      onSwipeRight,
      onEdgeSwipeRight,
    });

    // x=19 is within edge zone → should trigger edge swipe
    simulateSwipe(mockEl, 19, 100, 19 + SWIPE_THRESHOLD_PX + 10, 100);
    expect(onEdgeSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();

    // x=20 is outside edge zone → should trigger regular swipe right
    simulateSwipe(mockEl, 20, 100, 20 + SWIPE_THRESHOLD_PX + 10, 100);
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onEdgeSwipeRight).toHaveBeenCalledTimes(1); // still 1 from before

    detector.destroy();
  });
});
