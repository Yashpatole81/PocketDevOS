import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Returns the current viewport height using the visualViewport API with fallback.
 * Uses `visualViewport.height` when available (accounts for virtual keyboard and browser chrome),
 * otherwise falls back to `window.innerHeight`.
 *
 * This avoids the classic 100vh mobile browser bug where the address bar is not accounted for.
 * For CSS-based solutions, use the `dvh` unit (see globals.css `.h-dvh` utility).
 */
export function useViewportHeight(): number {
  const [height, setHeight] = useState(() => {
    if (typeof window === "undefined") return 0;
    return window.visualViewport?.height ?? window.innerHeight;
  });

  useEffect(() => {
    function update() {
      setHeight(window.visualViewport?.height ?? window.innerHeight);
    }

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener("resize", update);
      viewport.addEventListener("scroll", update);
    } else {
      window.addEventListener("resize", update);
    }

    return () => {
      if (viewport) {
        viewport.removeEventListener("resize", update);
        viewport.removeEventListener("scroll", update);
      } else {
        window.removeEventListener("resize", update);
      }
    };
  }, []);

  return height;
}

/**
 * Detects whether the virtual keyboard is visible by monitoring viewport height changes.
 * Returns `true` when the visual viewport shrinks by more than 25% compared to the
 * initial window height — a reliable heuristic for keyboard appearance on mobile.
 *
 * The 25% threshold (0.75 ratio) avoids false positives from browser chrome changes
 * while reliably detecting keyboard appearance on both iOS and Android.
 */
export function useKeyboardVisible(): boolean {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const initialHeightRef = useRef<number>(
    typeof window !== "undefined" ? window.innerHeight : 0
  );

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    // Capture the initial full height (without keyboard)
    initialHeightRef.current = window.innerHeight;

    const KEYBOARD_THRESHOLD = 0.75; // viewport shrinks > 25%

    function handleResize() {
      if (!viewport) return;
      const ratio = viewport.height / initialHeightRef.current;
      setKeyboardVisible(ratio < KEYBOARD_THRESHOLD);
    }

    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);

    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  }, []);

  return keyboardVisible;
}

export type Orientation = "portrait" | "landscape";

/**
 * Returns the current device orientation ('portrait' | 'landscape') and updates
 * on orientation change. Uses the Screen Orientation API when available, with
 * fallback to comparing window dimensions.
 *
 * Re-layout is triggered within 300ms of an orientation change as required by
 * the responsive viewport handling specification.
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(() => {
    if (typeof window === "undefined") return "portrait";
    // Prefer Screen Orientation API
    if (window.screen?.orientation?.type) {
      return window.screen.orientation.type.startsWith("portrait")
        ? "portrait"
        : "landscape";
    }
    // Fallback: compare dimensions
    return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function detectOrientation(): Orientation {
      if (window.screen?.orientation?.type) {
        return window.screen.orientation.type.startsWith("portrait")
          ? "portrait"
          : "landscape";
      }
      return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
    }

    function handleOrientationChange() {
      // Debounce to ensure re-layout completes within 300ms
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setOrientation(detectOrientation());
      }, 50); // Small delay to let the browser settle, well within 300ms budget
    }

    // Screen Orientation API (preferred)
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener("change", handleOrientationChange);
    }

    // Fallback events
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener("change", handleOrientationChange);
      }
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
    };
  }, []);

  return orientation;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Returns the computed safe-area-inset values from `env(safe-area-inset-*)`.
 * These values account for device notches, rounded corners, and system UI overlays.
 *
 * Uses a hidden measurement element to read the computed CSS values.
 * Updates on resize/orientation change to handle dynamic inset changes.
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  const measureRef = useRef<HTMLDivElement | null>(null);

  const measure = useCallback(() => {
    if (!measureRef.current) return;
    const style = getComputedStyle(measureRef.current);
    setInsets({
      top: parseFloat(style.paddingTop) || 0,
      right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
      left: parseFloat(style.paddingLeft) || 0,
    });
  }, []);

  useEffect(() => {
    // Create a hidden measurement element that uses env() values
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.width = "0";
    el.style.height = "0";
    el.style.visibility = "hidden";
    el.style.pointerEvents = "none";
    el.style.paddingTop = "env(safe-area-inset-top, 0px)";
    el.style.paddingRight = "env(safe-area-inset-right, 0px)";
    el.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
    el.style.paddingLeft = "env(safe-area-inset-left, 0px)";
    document.body.appendChild(el);
    measureRef.current = el;

    // Initial measurement
    measure();

    // Re-measure on resize and orientation change
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", measure);
    }

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", measure);
      }
      if (measureRef.current && document.body.contains(measureRef.current)) {
        document.body.removeChild(measureRef.current);
      }
      measureRef.current = null;
    };
  }, [measure]);

  return insets;
}
