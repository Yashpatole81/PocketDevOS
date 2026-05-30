import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  commandRegistry,
  type CommandCategory,
  type GroupedSearchResults,
  type SearchResult,
} from "../../lib/commandRegistry";
import { useNavigationStore } from "../../store/navigationStore";

// ─── Category Display Config ────────────────────────────────────────────────

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  files: "Files",
  commands: "Commands",
  recent: "Recent",
  "ai-actions": "AI Actions",
};

const CATEGORY_ORDER: CommandCategory[] = [
  "files",
  "commands",
  "recent",
  "ai-actions",
];

const CATEGORY_ICONS: Record<CommandCategory, React.ReactNode> = {
  files: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  ),
  commands: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  recent: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  "ai-actions": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
};

// ─── Debounce Utility ───────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ─── CommandPalette Component ───────────────────────────────────────────────

export interface CommandPaletteProps {
  open?: boolean;
  onClose?: () => void;
}

/**
 * CommandPalette — Raycast-inspired overlay for searching and executing commands.
 *
 * - Renders as a fixed centered overlay with backdrop
 * - Auto-focuses text input on open
 * - Displays results grouped by category (Files, Commands, Recent, AI Actions)
 * - Updates results within 150ms of each keystroke (debounced)
 * - Caps results at 8 per category (enforced by commandRegistry)
 * - Closes on Escape or tap/click outside
 * - Executes selected command/opens selected file on selection
 * - Opens via Ctrl+K (desktop) or Search tab (mobile)
 * - Uses monochrome theme
 */
export function CommandPalette({ open: openProp, onClose: onCloseProp }: CommandPaletteProps) {
  // Use store state if no props provided (allows both controlled and store-driven usage)
  const storeOpen = useNavigationStore((s) => s.commandPaletteOpen);
  const storeClose = useNavigationStore((s) => s.closeCommandPalette);

  const isOpen = openProp !== undefined ? openProp : storeOpen;
  const handleClose = onCloseProp || storeClose;

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 150);

  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // ─── Search Results ─────────────────────────────────────────────────────

  const results: GroupedSearchResults = commandRegistry.search(debouncedQuery);

  // Flatten results for keyboard navigation
  const flatResults: SearchResult[] = CATEGORY_ORDER.flatMap(
    (cat) => results[cat]
  );

  const totalResults = flatResults.length;

  // ─── Reset state when opening/closing ─────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      // Auto-focus input after render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // ─── Keyboard Shortcut (Ctrl+K) ──────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          useNavigationStore.getState().openCommandPalette();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // ─── Keyboard Navigation ──────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            totalResults > 0 ? (prev + 1) % totalResults : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            totalResults > 0 ? (prev - 1 + totalResults) % totalResults : 0
          );
          break;
        case "Enter":
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            executeResult(flatResults[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
      }
    },
    [totalResults, flatResults, selectedIndex, handleClose]
  );

  // ─── Execute Result ───────────────────────────────────────────────────

  const executeResult = useCallback(
    (result: SearchResult) => {
      handleClose();
      result.action();
    },
    [handleClose]
  );

  // ─── Click Outside ────────────────────────────────────────────────────

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        handleClose();
      }
    },
    [handleClose]
  );

  // ─── Reset selected index when results change ─────────────────────────

  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  // ─── Render ───────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const hasResults = totalResults > 0;
  let flatIndex = 0;

  return (
    <div
      ref={overlayRef}
      className={cn(
        "fixed inset-0 z-[100] flex items-start justify-center",
        "bg-black/60 backdrop-blur-sm",
        "animate-fade-in"
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className={cn(
          "w-full max-w-[560px] mt-[15vh]",
          "mx-4 rounded-xl overflow-hidden",
          "border border-[var(--color-border)]",
          "bg-[var(--color-surface-1)]",
          "shadow-2xl shadow-black/40",
          "animate-slide-up"
        )}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, files, actions..."
            className={cn(
              "flex-1 bg-transparent outline-none",
              "text-sm text-[var(--color-text-primary)]",
              "placeholder:text-[var(--color-text-muted)]"
            )}
            aria-label="Search commands"
            aria-activedescendant={
              hasResults ? `cmd-result-${flatResults[selectedIndex]?.id}` : undefined
            }
            role="combobox"
            aria-expanded={hasResults}
            aria-controls="command-palette-results"
            aria-autocomplete="list"
          />
          <kbd
            className={cn(
              "hidden sm:inline-flex items-center gap-0.5",
              "px-1.5 py-0.5 rounded text-[10px]",
              "text-[var(--color-text-muted)]",
              "border border-[var(--color-border)]",
              "bg-[var(--color-surface-2)]"
            )}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          id="command-palette-results"
          role="listbox"
          className={cn(
            "max-h-[50vh] overflow-y-auto",
            "py-2"
          )}
        >
          {!hasResults && debouncedQuery.length > 0 && (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No results found for "{debouncedQuery}"
            </div>
          )}

          {!hasResults && debouncedQuery.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              Type to search commands, files, and actions
            </div>
          )}

          {CATEGORY_ORDER.map((category) => {
            const categoryResults = results[category];
            if (categoryResults.length === 0) return null;

            return (
              <div key={category} className="mb-1">
                {/* Category Header */}
                <div className="flex items-center gap-2 px-4 py-1.5">
                  <span className="text-[var(--color-text-muted)]">
                    {CATEGORY_ICONS[category]}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                    {CATEGORY_LABELS[category]}
                  </span>
                </div>

                {/* Category Results */}
                {categoryResults.map((result) => {
                  const currentFlatIndex = flatIndex;
                  flatIndex++;
                  const isSelected = currentFlatIndex === selectedIndex;

                  return (
                    <button
                      key={result.id}
                      id={`cmd-result-${result.id}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => executeResult(result)}
                      onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5",
                        "text-left text-sm transition-colors duration-100",
                        "min-h-[44px]",
                        isSelected
                          ? "bg-[var(--color-surface-3)] text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                      )}
                    >
                      {result.icon && (
                        <span className="shrink-0 text-[var(--color-text-muted)]">
                          {result.icon}
                        </span>
                      )}
                      <span className="flex-1 truncate">{result.label}</span>
                      {result.description && (
                        <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[120px]">
                          {result.description}
                        </span>
                      )}
                      {isSelected && (
                        <kbd
                          className={cn(
                            "hidden sm:inline-flex items-center",
                            "px-1.5 py-0.5 rounded text-[10px]",
                            "text-[var(--color-text-muted)]",
                            "border border-[var(--color-border)]",
                            "bg-[var(--color-surface-2)]"
                          )}
                        >
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {hasResults && (
          <div
            className={cn(
              "flex items-center justify-between px-4 py-2",
              "border-t border-[var(--color-border)]",
              "text-[11px] text-[var(--color-text-muted)]"
            )}
          >
            <span>{totalResults} result{totalResults !== 1 ? "s" : ""}</span>
            <div className="hidden sm:flex items-center gap-2">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[10px]">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[10px]">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[10px]">esc</kbd>
                close
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
