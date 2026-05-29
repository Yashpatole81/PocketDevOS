import { useState, useEffect } from "react";

/**
 * Returns true when the viewport is mobile-sized (< 768px width)
 * AND the device is in portrait orientation.
 * In landscape mode on phones, we use the desktop layout.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    function check() {
      const mobile = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
      setIsMobile(mobile);
    }

    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);

    // Also listen to visualViewport for virtual keyboard changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", check);
    }

    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", check);
      }
    };
  }, []);

  return isMobile;
}

/**
 * Tracks the visual viewport height to handle virtual keyboard.
 * Returns the available height in pixels.
 */
export function useViewportHeight(): number {
  const [height, setHeight] = useState(() => {
    if (typeof window === "undefined") return 0;
    return window.visualViewport?.height || window.innerHeight;
  });

  useEffect(() => {
    function update() {
      setHeight(window.visualViewport?.height || window.innerHeight);
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", update);
      window.visualViewport.addEventListener("scroll", update);
    } else {
      window.addEventListener("resize", update);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", update);
        window.visualViewport.removeEventListener("scroll", update);
      } else {
        window.removeEventListener("resize", update);
      }
    };
  }, []);

  return height;
}
