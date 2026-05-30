import { useNavigationStore } from "@/store/navigationStore";

export interface Shortcut {
  id: string;
  label: string;
  keys: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  key: string;
}

export const shortcuts: Shortcut[] = [
  { id: "command-palette", label: "Command Palette", keys: "Ctrl+K", ctrl: true, key: "k" },
  { id: "toggle-terminal", label: "Toggle Terminal", keys: "Ctrl+`", ctrl: true, key: "`" },
  { id: "toggle-sidebar", label: "Toggle Sidebar", keys: "Ctrl+B", ctrl: true, key: "b" },
  { id: "toggle-ai", label: "Toggle AI Panel", keys: "Ctrl+J", ctrl: true, key: "j" },
  { id: "quick-open", label: "Quick Open", keys: "Ctrl+P", ctrl: true, key: "p" },
  { id: "new-terminal", label: "New Terminal", keys: "Ctrl+Shift+N", ctrl: true, shift: true, key: "n" },
  { id: "open-settings", label: "Open Settings", keys: "Ctrl+,", ctrl: true, key: "," },
];

export function matchShortcut(e: KeyboardEvent): Shortcut | null {
  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;

  for (const shortcut of shortcuts) {
    const ctrlMatch = shortcut.ctrl ? ctrl : !ctrl;
    const shiftMatch = shortcut.shift ? shift : !shift;
    const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

    if (ctrlMatch && shiftMatch && keyMatch) {
      return shortcut;
    }
  }

  return null;
}

/**
 * Global keydown handler for the command palette shortcut (Ctrl+K / Cmd+K).
 * Registered on the document in the capturing phase so it takes priority
 * over CodeMirror's Ctrl+K ("kill line") binding which listens at the
 * editor element level in the bubbling phase.
 */
function handleGlobalKeyDown(e: KeyboardEvent): void {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;

  const key = e.key.toLowerCase();
  if (key !== "k") return;

  // Prevent default browser behavior and stop propagation so CodeMirror
  // (or any other component) doesn't also handle this key combo.
  e.preventDefault();
  e.stopPropagation();

  const { commandPaletteOpen, openCommandPalette, closeCommandPalette } =
    useNavigationStore.getState();

  if (commandPaletteOpen) {
    closeCommandPalette();
  } else {
    openCommandPalette();
  }
}

let registered = false;

/**
 * Registers the global Ctrl+K / Cmd+K shortcut at the document level
 * using the capturing phase. This ensures the command palette shortcut
 * works from any view and takes priority over editor-level shortcuts
 * (e.g., CodeMirror's Ctrl+K for "kill line").
 *
 * Safe to call multiple times — only registers once.
 */
export function registerGlobalShortcuts(): void {
  if (registered) return;
  document.addEventListener("keydown", handleGlobalKeyDown, true);
  registered = true;
}

/**
 * Unregisters the global keyboard shortcuts. Call on app unmount or cleanup.
 */
export function unregisterGlobalShortcuts(): void {
  if (!registered) return;
  document.removeEventListener("keydown", handleGlobalKeyDown, true);
  registered = false;
}
