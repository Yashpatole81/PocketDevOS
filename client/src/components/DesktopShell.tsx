import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { AdaptiveSidebar } from "@/components/AdaptiveSidebar";
import { usePanelStore } from "@/store/panelStore";
import { useNavigationStore } from "@/store/navigationStore";
import { useAiStore } from "@/store/aiStore";

/**
 * DesktopShell — the top-level layout for tablet/desktop viewports (≥ 768px).
 * Composes AdaptiveSidebar + PanelSystem with a CommandPalette overlay.
 */
export function DesktopShell() {
  const sidebarCollapsed = usePanelStore((s) => s.sidebarCollapsed);
  const toggleSidebar = usePanelStore((s) => s.toggleSidebar);
  const restoreLayout = usePanelStore((s) => s.restoreLayout);

  const activeTab = useNavigationStore((s) => s.activeTab);
  const setActiveTab = useNavigationStore((s) => s.setActiveTab);
  const commandPaletteOpen = useNavigationStore((s) => s.commandPaletteOpen);
  const openCommandPalette = useNavigationStore((s) => s.openCommandPalette);
  const closeCommandPalette = useNavigationStore((s) => s.closeCommandPalette);

  const agentActive = useAiStore((s) => s.status === "thinking");

  // Restore panel layout from localStorage on mount
  useEffect(() => {
    restoreLayout();
  }, [restoreLayout]);

  // Listen for Ctrl+K to open command palette
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openCommandPalette();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openCommandPalette]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[var(--color-background)]">
      {/* Sidebar */}
      <AdaptiveSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        activeTab={activeTab}
        onNavigate={setActiveTab}
        agentActive={agentActive}
      />

      {/* Main content area — offset by sidebar width */}
      <main
        className={cn(
          "h-full transition-[margin-left] duration-200 ease-in-out",
          sidebarCollapsed ? "ml-12" : "ml-60"
        )}
      >
        {/* PanelSystem placeholder — will be replaced when PanelSystem component is implemented (task 6.2) */}
        <div className="h-full w-full" data-testid="panel-system-area">
          {/* Panel content renders here */}
        </div>
      </main>

      {/* Command Palette overlay */}
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeCommandPalette}
            aria-hidden="true"
          />

          {/* Palette container — placeholder until CommandPalette component is implemented (task 10.1) */}
          <div
            className={cn(
              "relative z-10 w-full max-w-lg rounded-xl",
              "bg-[var(--color-surface-2)] border border-[var(--color-border)]",
              "p-4 shadow-lg"
            )}
          >
            <input
              type="text"
              placeholder="Type a command or search..."
              autoFocus
              className={cn(
                "w-full rounded-lg px-4 py-3",
                "bg-[var(--color-surface-1)] border border-[var(--color-border)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                "outline-none focus:ring-2 focus:ring-[var(--color-accent)]",
                "text-sm"
              )}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  closeCommandPalette();
                }
              }}
            />
            <p className="mt-3 text-xs text-[var(--color-text-muted)] text-center">
              Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
