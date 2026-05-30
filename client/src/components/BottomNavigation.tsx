import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type MobileTab = 'home' | 'workspace' | 'projects' | 'search' | 'settings';

export interface BottomNavigationProps {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  agentActive: boolean;
}

// --- Tab Definitions with inline SVG icons ---

const tabs: { id: MobileTab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: 'home',
    label: 'Home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

/**
 * Hook to detect virtual keyboard visibility using the visualViewport API.
 * Returns true when the keyboard is likely visible (viewport height shrinks significantly).
 */
function useKeyboardVisible(): boolean {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const KEYBOARD_THRESHOLD = 0.75; // If viewport height < 75% of window height, keyboard is likely open

    function handleResize() {
      if (!viewport) return;
      const ratio = viewport.height / window.innerHeight;
      setKeyboardVisible(ratio < KEYBOARD_THRESHOLD);
    }

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  return keyboardVisible;
}

/**
 * BottomNavigation — Five-tab navigation for phone layout.
 *
 * - Fixed at the bottom of the viewport within 80px
 * - Dark surface background (var(--color-surface-1))
 * - Monochrome theme with accent color for active tab
 * - 44x44px minimum touch targets
 * - Pulsing indicator when agentActive is true
 * - Hides when virtual keyboard is visible
 * - Crossfade transition on tab change (200ms)
 * - Safe-area-inset-bottom padding
 */
export function BottomNavigation({ active, onChange, agentActive }: BottomNavigationProps) {
  const keyboardVisible = useKeyboardVisible();

  if (keyboardVisible) {
    return null;
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "flex items-center justify-around",
        "h-[80px] border-t border-[var(--color-border)]",
        "safe-bottom"
      )}
      style={{ background: 'var(--color-surface-1)' }}
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1",
              "min-w-[44px] min-h-[44px] flex-1 h-full",
              "rounded-lg transition-all duration-200 ease-in-out",
              "focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-[-2px]",
              isActive
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            )}
          >
            {/* Icon with crossfade */}
            <span className={cn("animate-crossfade", isActive && "scale-110 transition-transform duration-200")}>
              {tab.icon(isActive)}
            </span>

            {/* Label */}
            <span
              className={cn(
                "text-[10px] font-medium leading-none transition-opacity duration-200",
                isActive ? "opacity-100" : "opacity-70"
              )}
            >
              {tab.label}
            </span>

            {/* Active indicator dot */}
            {isActive && (
              <span className="absolute bottom-2 w-1 h-1 rounded-full bg-[var(--color-accent)] animate-fade-in" />
            )}

            {/* Agent active pulsing indicator (shown on workspace tab) */}
            {agentActive && tab.id === 'workspace' && (
              <span
                className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse-dot"
                aria-label="AI agent is active"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
