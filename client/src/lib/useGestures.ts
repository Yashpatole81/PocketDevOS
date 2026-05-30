import { useEffect, useRef, type RefObject } from "react";
import { SwipeDetector, type SwipeCallbacks } from "./gestures";

/**
 * Options for the useGestures hook.
 * All callbacks are optional — only wire the gestures you need.
 */
export interface UseGesturesOptions extends SwipeCallbacks {}

/**
 * React hook that wraps the SwipeDetector class for declarative gesture support.
 *
 * Attaches touch event listeners to the referenced element and invokes callbacks
 * when swipe gestures are detected. Automatically cleans up on unmount or when
 * the ref changes.
 *
 * @param ref - React ref to the target HTML element
 * @param options - Swipe callback options (onSwipeLeft, onSwipeRight, onSwipeDown, onEdgeSwipeRight)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   useGestures(containerRef, {
 *     onEdgeSwipeRight: () => openFileExplorer(),
 *     onSwipeDown: () => dismissKeyboard(),
 *   });
 *   return <div ref={containerRef}>...</div>;
 * }
 * ```
 */
export function useGestures(
  ref: RefObject<HTMLElement | null>,
  options: UseGesturesOptions
): void {
  // Store callbacks in a ref to avoid re-creating the detector on every render
  const callbacksRef = useRef<UseGesturesOptions>(options);
  callbacksRef.current = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const detector = new SwipeDetector(element, {
      onSwipeLeft: () => callbacksRef.current.onSwipeLeft?.(),
      onSwipeRight: () => callbacksRef.current.onSwipeRight?.(),
      onSwipeDown: () => callbacksRef.current.onSwipeDown?.(),
      onEdgeSwipeRight: () => callbacksRef.current.onEdgeSwipeRight?.(),
    });

    return () => {
      detector.destroy();
    };
  }, [ref]);
}
