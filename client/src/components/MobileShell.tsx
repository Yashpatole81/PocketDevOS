import { useEffect, useState, useCallback, useRef } from "react";
import { TopBar } from "./TopBar";
import { BottomNavigation } from "./BottomNavigation";
import { ContentRouter } from "./ContentRouter";
import { useNavigationStore } from "@/store/navigationStore";
import { useAiStore } from "@/store/aiStore";
import { useConnectionStore } from "@/lib/useConnectionStatus";
import { useGestures } from "@/lib/useGestures";

/**
 * Hook to detect virtual keyboard visibility using the visualViewport API.
 * Returns true when the keyboard is likely visible (viewport height shrinks significantly).
 */
function useKeyboardVisible(): boolean {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const KEYBOARD_THRESHOLD = 0.75;

    function handleResize() {
      if (!viewport) return;
      const ratio = viewport.height / window.innerHeight;
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

/**
 * Hook to track the visual viewport height for accurate content sizing.
 * Uses the visualViewport API to account for virtual keyboard and browser chrome.
 */
function useVisualViewportHeight(): number {
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

const TOP_BAR_HEIGHT = 48;
const BOTTOM_NAV_HEIGHT = 80;

/**
 * MobileShell — The root layout component for phone-sized viewports (< 768px).
 *
 * Structure:
 * - TopBar (48px fixed at top)
 * - ContentRouter (fills remaining space)
 * - BottomNavigation (80px fixed at bottom, hides when keyboard is visible)
 *
 * Uses `100dvh` for full viewport height with fallback to visualViewport API.
 * Handles virtual keyboard appearance by hiding BottomNavigation and expanding content.
 * Applies safe-area-insets for notches and rounded corners.
 */
export function MobileShell() {
  const { activeTab, setActiveTab } = useNavigationStore();
  const status = useAiStore((s) => s.status);

  const keyboardVisible = useKeyboardVisible();
  const viewportHeight = useVisualViewportHeight();

  // Ref for gesture detection on the shell container
  const shellRef = useRef<HTMLDivElement>(null);

  // Agent is active when AI is thinking or awaiting approval
  const agentActive = status === "thinking" || status === "awaiting-approval";

  // Connection status from the dedicated connection store
  const connectionStatus = useConnectionStore((s) => s.status);

  const handleSettingsClick = useCallback(() => {
    setActiveTab("settings");
  }, [setActiveTab]);

  const handleTabChange = useCallback(
    (tab: typeof activeTab) => {
      setActiveTab(tab);
    },
    [setActiveTab]
  );

  // Edge swipe right from left edge → open file explorer (projects tab)
  const handleEdgeSwipeRight = useCallback(() => {
    setActiveTab("projects");
  }, [setActiveTab]);

  // Swipe down on shell → dismiss virtual keyboard
  const handleSwipeDown = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
  }, []);

  // Wire gesture support to the shell container
  useGestures(shellRef, {
    onEdgeSwipeRight: handleEdgeSwipeRight,
    onSwipeDown: handleSwipeDown,
  });

  // Calculate content area height
  // When keyboard is visible, BottomNavigation hides, so content gets that space back
  const contentHeight = keyboardVisible
    ? viewportHeight - TOP_BAR_HEIGHT
    : viewportHeight - TOP_BAR_HEIGHT - BOTTOM_NAV_HEIGHT;

  return (
    <div
      ref={shellRef}
      className="h-dvh w-full flex flex-col bg-[var(--color-background)] safe-left safe-right overflow-hidden"
      style={{
        // Fallback for browsers that don't support dvh
        height: `${viewportHeight}px`,
      }}
    >
      {/* TopBar — fixed 48px at top with safe-area-inset-top */}
      <TopBar
        agentActive={agentActive}
        connectionStatus={connectionStatus}
        onSettingsClick={handleSettingsClick}
      />

      {/* Content area — fills remaining space between TopBar and BottomNavigation */}
      <main
        className="flex-1 overflow-hidden"
        style={{
          marginTop: TOP_BAR_HEIGHT,
          height: `${contentHeight}px`,
        }}
      >
        <ContentRouter />
      </main>

      {/* BottomNavigation — 80px at bottom, hides when keyboard is visible */}
      {!keyboardVisible && (
        <BottomNavigation
          active={activeTab}
          onChange={handleTabChange}
          agentActive={agentActive}
        />
      )}
    </div>
  );
}
