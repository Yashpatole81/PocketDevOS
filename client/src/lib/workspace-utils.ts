/**
 * Shared utility functions for the AI-first workspace.
 * Covers dashboard data selection, editor font clamping, language mode mapping,
 * WCAG contrast ratio calculation, and fuzzy matching for the command palette.
 */

/**
 * Returns the top-N items sorted by timestamp descending, with an optional filter.
 * Items are first filtered (if filterFn is provided), then sorted by getTimestamp
 * descending, and the first N items are returned.
 */
export function selectTopN<T>(
  items: T[],
  n: number,
  getTimestamp: (item: T) => number,
  filterFn?: (item: T) => boolean
): T[] {
  const filtered = filterFn ? items.filter(filterFn) : items;
  const sorted = [...filtered].sort((a, b) => getTimestamp(b) - getTimestamp(a));
  return sorted.slice(0, n);
}

/**
 * Clamps the result of current * scale to the range [10, 24] inclusive.
 * Used for pinch-to-zoom font size adjustment in the editor.
 */
export function clampFontSize(scale: number, current: number): number {
  const result = current * scale;
  return Math.min(24, Math.max(10, result));
}

/**
 * Maps file extensions to CodeMirror language mode string identifiers.
 * Returns 'plaintext' for unrecognized extensions.
 */
export function getLanguageMode(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();

  const extensionMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.css': 'css',
    '.html': 'html',
    '.json': 'json',
    '.md': 'markdown',
  };

  return extensionMap[ext] ?? 'plaintext';
}

/**
 * Parses a hex color string (e.g. "#FFFFFF" or "#FFF") into [r, g, b] values (0–255).
 */
function parseHexColor(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  let r: number, g: number, b: number;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  }

  return [r, g, b];
}

/**
 * Computes the relative luminance of a color per WCAG 2.1.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Computes the WCAG 2.1 contrast ratio between two hex colors.
 * Returns a value between 1 and 21.
 */
export function computeContrastRatio(fg: string, bg: string): number {
  const [fgR, fgG, fgB] = parseHexColor(fg);
  const [bgR, bgG, bgB] = parseHexColor(bg);

  const l1 = relativeLuminance(fgR, fgG, fgB);
  const l2 = relativeLuminance(bgR, bgG, bgB);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Fuzzy string matching for the command palette.
 * Returns true if all characters of query appear in target in order (case-insensitive).
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
    }
  }

  return qi === q.length;
}
