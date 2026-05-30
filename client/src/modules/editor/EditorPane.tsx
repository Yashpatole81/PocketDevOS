import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import { keymap } from "@codemirror/view";
import { autocompletion } from "@codemirror/autocomplete";
import { search } from "@codemirror/search";
import type { Extension } from "@codemirror/state";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useEditor } from "./useEditor";
import { useAppStore } from "@/store/appStore";
import { useIsMobile } from "@/lib/useIsMobile";
import { clampFontSize, getLanguageMode } from "@/lib/workspace-utils";

/**
 * Maps a language mode string (from getLanguageMode) to a CodeMirror Extension.
 */
function getLanguageExtension(mode: string): Extension {
  switch (mode) {
    case "javascript":
      return javascript({ jsx: true, typescript: false });
    case "typescript":
      return javascript({ jsx: true, typescript: true });
    case "python":
      return python();
    case "json":
      return json();
    case "html":
      return html();
    case "css":
      return css();
    case "markdown":
      return markdown();
    default:
      return [];
  }
}

/** AI ghost text suggestion displayed inline in the editor. */
interface GhostSuggestion {
  text: string;
  line: number;
  col: number;
}

interface EditorPaneProps {
  /** Optional file path — when provided, renders a single file without tabs. */
  filePath?: string;
  /** Optional content — when provided alongside filePath, uses this content directly. */
  content?: string;
}

/**
 * Enhanced EditorPane with touch-friendly features:
 * - File tabs with 44px height and 80px minimum width
 * - Pinch-to-zoom for font size (clamped to 10px–24px)
 * - Inline AI ghost text suggestions (accept via tap or swipe-right)
 * - Prompt to save on tab close if file has unsaved changes
 * - Uses getLanguageMode utility for syntax highlighting
 * - On phone viewport, occupies full content area below top bar and above bottom nav
 */
export function EditorPane({ filePath, content }: EditorPaneProps) {
  const openFiles = useAppStore((s) => s.openFiles);
  const activeFileIndex = useAppStore((s) => s.activeFileIndex);
  const setActiveFile = useAppStore((s) => s.setActiveFile);
  const closeFile = useAppStore((s) => s.closeFile);

  const isMobile = useIsMobile();

  // Determine if we're in "single file" mode (props provided) or "tabbed" mode
  const singleFileMode = filePath !== undefined && content !== undefined;

  const activeFile = singleFileMode
    ? { path: filePath!, name: filePath!.split("/").pop() || filePath!, content: content!, dirty: false }
    : activeFileIndex >= 0
      ? openFiles[activeFileIndex]
      : null;

  // Font size state for pinch-to-zoom
  const [fontSize, setFontSize] = useState(14);

  // Ghost text suggestion state
  const [ghostSuggestion, setGhostSuggestion] = useState<GhostSuggestion | null>(null);

  // Save confirmation dialog state
  const [pendingCloseFile, setPendingCloseFile] = useState<string | null>(null);

  // Pinch-to-zoom tracking
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartFontRef = useRef<number>(14);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Set up pinch-to-zoom touch handlers
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDistRef.current = Math.hypot(dx, dy);
        pinchStartFontRef.current = fontSize;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const scale = currentDist / pinchStartDistRef.current;
        const newSize = clampFontSize(scale, pinchStartFontRef.current);
        setFontSize(newSize);
        e.preventDefault();
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        pinchStartDistRef.current = null;
      }
    }

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [fontSize]);

  // Handle tab close with unsaved changes check
  const handleTabClose = useCallback(
    (path: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const file = openFiles.find((f) => f.path === path);
      if (file?.dirty) {
        setPendingCloseFile(path);
      } else {
        closeFile(path);
      }
    },
    [openFiles, closeFile],
  );

  // Accept ghost suggestion via tap
  const acceptGhostSuggestion = useCallback(() => {
    if (!ghostSuggestion || !activeFile) return;
    const { updateFileContent } = useAppStore.getState();
    const lines = activeFile.content.split("\n");
    const lineIdx = ghostSuggestion.line;
    if (lineIdx < lines.length) {
      lines[lineIdx] =
        lines[lineIdx].slice(0, ghostSuggestion.col) +
        ghostSuggestion.text +
        lines[lineIdx].slice(ghostSuggestion.col);
      updateFileContent(activeFile.path, lines.join("\n"));
    }
    setGhostSuggestion(null);
  }, [ghostSuggestion, activeFile]);

  // Ghost suggestion swipe-right handler
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container || !ghostSuggestion) return;

    let startX = 0;
    let startY = 0;

    function handleSwipeStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    }

    function handleSwipeEnd(e: TouchEvent) {
      if (e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - startX;
        const dy = Math.abs(e.changedTouches[0].clientY - startY);
        // Swipe right with at least 30px horizontal and mostly horizontal
        if (dx >= 30 && dy < dx) {
          acceptGhostSuggestion();
        }
      }
    }

    container.addEventListener("touchstart", handleSwipeStart, { passive: true });
    container.addEventListener("touchend", handleSwipeEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleSwipeStart);
      container.removeEventListener("touchend", handleSwipeEnd);
    };
  }, [ghostSuggestion, acceptGhostSuggestion]);

  if (!activeFile) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[var(--color-text-secondary)]">
        <p className="text-sm">No file open</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full w-full overflow-hidden ${
        isMobile ? "absolute inset-0" : ""
      }`}
    >
      {/* File Tabs - 44px height, 80px min width for touch targets */}
      {!singleFileMode && (
        <div
          className="flex items-center overflow-x-auto border-b border-[var(--color-border)]"
          style={{ minHeight: "44px", height: "44px" }}
          role="tablist"
          aria-label="Open files"
        >
          {openFiles.map((file, index) => (
            <button
              key={file.path}
              onClick={() => setActiveFile(index)}
              className={`flex items-center gap-2 px-3 h-full border-r border-[var(--color-border)] shrink-0 transition-colors duration-150 ${
                index === activeFileIndex
                  ? "bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
                  : "bg-[var(--color-surface-1)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
              }`}
              style={{ minWidth: "80px" }}
              aria-label={`Tab: ${file.name}`}
              aria-selected={index === activeFileIndex}
              role="tab"
            >
              <span className="text-xs truncate max-w-[120px]">
                {file.name}
                {file.dirty && <span className="ml-1 text-[var(--color-accent)]">●</span>}
              </span>
              <span
                onClick={(e) => handleTabClose(file.path, e)}
                className="ml-auto flex items-center justify-center w-5 h-5 rounded hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)]"
                role="button"
                aria-label={`Close ${file.name}`}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Ghost text suggestion indicator */}
      {ghostSuggestion && (
        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--color-surface-2)] border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
          <span className="text-[var(--color-accent)]">AI suggestion</span>
          <button
            onClick={acceptGhostSuggestion}
            className="px-2 py-0.5 rounded bg-[var(--color-accent)] text-[var(--color-bg)] text-xs"
            style={{ minHeight: "28px", minWidth: "44px" }}
          >
            Accept
          </button>
          <button
            onClick={() => setGhostSuggestion(null)}
            className="px-2 py-0.5 rounded border border-[var(--color-border)] text-xs"
            style={{ minHeight: "28px", minWidth: "44px" }}
          >
            Dismiss
          </button>
          <span className="ml-auto text-[var(--color-text-muted)]">
            Tap or swipe right to accept
          </span>
        </div>
      )}

      {/* Editor area with pinch-to-zoom */}
      <div ref={editorContainerRef} className="flex-1 overflow-hidden">
        <EditorContent
          filePath={activeFile.path}
          content={activeFile.content}
          fontSize={fontSize}
        />
      </div>

      {/* Save confirmation dialog */}
      {pendingCloseFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-4 mx-4 max-w-sm w-full">
            <p className="text-sm text-[var(--color-text-primary)] mb-4">
              This file has unsaved changes. Save before closing?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  closeFile(pendingCloseFile);
                  setPendingCloseFile(null);
                }}
                className="px-3 py-2 rounded text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                style={{ minHeight: "44px", minWidth: "80px" }}
              >
                Discard
              </button>
              <button
                onClick={() => setPendingCloseFile(null)}
                className="px-3 py-2 rounded text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                style={{ minHeight: "44px", minWidth: "80px" }}
              >
                Cancel
              </button>
              <SaveAndCloseButton
                filePath={pendingCloseFile}
                onDone={() => {
                  closeFile(pendingCloseFile);
                  setPendingCloseFile(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Internal component that renders the CodeMirror editor for the active file. */
function EditorContent({
  filePath,
  content,
  fontSize,
}: {
  filePath: string;
  content: string;
  fontSize: number;
}) {
  const { viewRef, save, handleChange } = useEditor(filePath);
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  // Store the view reference when CodeMirror mounts
  useEffect(() => {
    if (cmRef.current?.view) {
      viewRef.current = cmRef.current.view;
    }
  });

  // Use getLanguageMode from workspace-utils for syntax highlighting
  const languageMode = getLanguageMode(filePath);
  const langExtension = useMemo(() => getLanguageExtension(languageMode), [languageMode]);

  // Ctrl+S / Cmd+S save keybinding
  const saveKeymap = useMemo(
    () =>
      keymap.of([
        {
          key: "Mod-s",
          run: () => {
            save();
            return true;
          },
        },
      ]),
    [save],
  );

  const extensions = useMemo(
    () => [langExtension, saveKeymap, autocompletion(), search()],
    [langExtension, saveKeymap],
  );

  const onChange = useCallback(
    (value: string) => {
      handleChange(value);
    },
    [handleChange],
  );

  return (
    <CodeMirror
      ref={cmRef}
      value={content}
      height="100%"
      theme={tokyoNight}
      extensions={extensions}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightActiveLine: true,
        foldGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        indentOnInput: true,
        tabSize: 2,
      }}
      className="h-full"
      style={{ fontSize: `${fontSize}px` }}
    />
  );
}

/** Button that saves the file and then closes it. */
function SaveAndCloseButton({
  filePath,
  onDone,
}: {
  filePath: string;
  onDone: () => void;
}) {
  const { save } = useEditor(filePath);

  const handleSaveAndClose = useCallback(async () => {
    await save();
    onDone();
  }, [save, onDone]);

  return (
    <button
      onClick={handleSaveAndClose}
      className="px-3 py-2 rounded text-xs bg-[var(--color-accent)] text-[var(--color-bg)]"
      style={{ minHeight: "44px", minWidth: "80px" }}
    >
      Save
    </button>
  );
}
