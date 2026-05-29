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
