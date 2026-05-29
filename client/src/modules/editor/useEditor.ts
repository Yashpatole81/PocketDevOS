import { useCallback, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { fs as fsApi } from "@/lib/api";
import { useAppStore } from "@/store/appStore";

/**
 * Hook for editor state management: save, language detection, etc.
 */
export function useEditor(filePath: string) {
  const viewRef = useRef<EditorView | null>(null);
  const updateFileContent = useAppStore((s) => s.updateFileContent);
  const markFileSaved = useAppStore((s) => s.markFileSaved);

  const save = useCallback(async () => {
    const view = viewRef.current;
    if (!view) return;

    const content = view.state.doc.toString();
    try {
      await fsApi.write(filePath, content);
      markFileSaved(filePath);
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }, [filePath, markFileSaved]);

  const handleChange = useCallback(
    (content: string) => {
      updateFileContent(filePath, content);
    },
    [filePath, updateFileContent],
  );

  return { viewRef, save, handleChange };
}

/**
 * Detect language mode based on file extension.
 */
export function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return "javascript";
    case "py":
      return "python";
    case "json":
      return "json";
    case "html":
    case "htm":
      return "html";
    case "css":
    case "scss":
      return "css";
    case "md":
    case "markdown":
      return "markdown";
    default:
      return "javascript";
  }
}
