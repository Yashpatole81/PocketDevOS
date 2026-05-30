/** Minimum swipe distance in pixels before triggering any gesture action. */
export const SWIPE_THRESHOLD_PX = 30;

/** Maximum X coordinate from the left edge to qualify as an edge swipe. */
export const LEFT_EDGE_ZONE_PX = 20;

export interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  /** Called when a swipe-right originates from the left edge (X < 20px). */
  onEdgeSwipeRight?: () => void;
}

/**
 * Detects swipe gestures on a given HTMLElement.
 *
 * Tracks touchstart/touchmove/touchend events and triggers callbacks
 * when the swipe distance meets the minimum threshold (30px).
 * Also detects left-edge swipes (touchstart X < 20px from left edge).
 */
export class SwipeDetector {
  private element: HTMLElement;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private tracking = false;
  private isLeftEdge = false;

  public onSwipeLeft: (() => void) | null = null;
  public onSwipeRight: (() => void) | null = null;
  public onSwipeDown: (() => void) | null = null;
  /** Called when a swipe-right originates from the left edge (X < 20px). */
  public onEdgeSwipeRight: (() => void) | null = null;

  private handleTouchStart: (e: TouchEvent) => void;
  private handleTouchMove: (e: TouchEvent) => void;
  private handleTouchEnd: (e: TouchEvent) => void;

  constructor(element: HTMLElement, callbacks?: SwipeCallbacks) {
    this.element = element;

    if (callbacks) {
      this.onSwipeLeft = callbacks.onSwipeLeft ?? null;
      this.onSwipeRight = callbacks.onSwipeRight ?? null;
      this.onSwipeDown = callbacks.onSwipeDown ?? null;
      this.onEdgeSwipeRight = callbacks.onEdgeSwipeRight ?? null;
    }

    this.handleTouchStart = this.onTouchStart.bind(this);
    this.handleTouchMove = this.onTouchMove.bind(this);
    this.handleTouchEnd = this.onTouchEnd.bind(this);

    this.element.addEventListener("touchstart", this.handleTouchStart, { passive: true });
    this.element.addEventListener("touchmove", this.handleTouchMove, { passive: true });
    this.element.addEventListener("touchend", this.handleTouchEnd, { passive: true });
  }

  private onTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    if (!touch) return;

    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;
    this.tracking = true;
    this.isLeftEdge = touch.clientX < LEFT_EDGE_ZONE_PX;
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.tracking) return;

    const touch = e.touches[0];
    if (!touch) return;

    this.currentX = touch.clientX;
    this.currentY = touch.clientY;
  }

  private onTouchEnd(_e: TouchEvent): void {
    if (!this.tracking) return;
    this.tracking = false;

    const deltaX = this.currentX - this.startX;
    const deltaY = this.currentY - this.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check if the swipe meets the minimum distance threshold
    if (absDeltaX < SWIPE_THRESHOLD_PX && absDeltaY < SWIPE_THRESHOLD_PX) {
      return;
    }

    // Determine dominant direction
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0) {
        // Swipe right — check if it started from the left edge
        if (this.isLeftEdge && this.onEdgeSwipeRight) {
          this.onEdgeSwipeRight();
        } else {
          this.onSwipeRight?.();
        }
      } else {
        this.onSwipeLeft?.();
      }
    } else {
      // Vertical swipe (only down is supported)
      if (deltaY > 0) {
        this.onSwipeDown?.();
      }
    }
  }

  /** Whether the current/last swipe started from the left edge of the screen. */
  get startedFromLeftEdge(): boolean {
    return this.isLeftEdge;
  }

  /** Remove all event listeners and clean up. */
  destroy(): void {
    this.element.removeEventListener("touchstart", this.handleTouchStart);
    this.element.removeEventListener("touchmove", this.handleTouchMove);
    this.element.removeEventListener("touchend", this.handleTouchEnd);
  }
}
