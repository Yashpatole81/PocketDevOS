import { useEffect } from "react";
import { matchShortcut } from "./shortcuts";
import { useAppStore } from "@/store/appStore";
import { useAiStore } from "@/store/aiStore";
import { useSettingsStore } from "@/store/settingsStore";

export function useShortcuts() {
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleAiPanel = useAiStore((s) => s.togglePanel);
  const openSettings = useSettingsStore((s) => s.openSettings);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const shortcut = matchShortcut(e);
      if (!shortcut) return;

      // Don't intercept if user is typing in an input/textarea (except for our shortcuts)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (isInput && shortcut.id !== "toggle-terminal") return;

      e.preventDefault();

      switch (shortcut.id) {
        case "toggle-sidebar":
          toggleSidebar();
          break;
        case "toggle-ai":
          toggleAiPanel();
          break;
        case "open-settings":
          openSettings();
          break;
        case "toggle-terminal":
          // Handled by the App component's active panel logic on mobile
          break;
        case "quick-open":
          // Future: quick file open
          break;
        case "new-terminal":
          // Future: create new terminal tab
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar, toggleAiPanel, openSettings]);
}
