import { useCallback, useMemo } from "react";
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
import { useEditor, getLanguageFromPath } from "./useEditor";
import { useRef, useEffect } from "react";

interface EditorPaneProps {
  filePath: string;
  content: string;
}

function getLanguageExtension(lang: string): Extension {
  switch (lang) {
    case "javascript":
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
      return javascript({ jsx: true, typescript: true });
  }
}

export function EditorPane({ filePath, content }: EditorPaneProps) {
  const { viewRef, save, handleChange } = useEditor(filePath);
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  // Store the view reference when CodeMirror mounts
  useEffect(() => {
    if (cmRef.current?.view) {
      viewRef.current = cmRef.current.view;
    }
  });

  const lang = getLanguageFromPath(filePath);
  const langExtension = useMemo(() => getLanguageExtension(lang), [lang]);

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
    <div className="h-full w-full overflow-hidden">
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
      />
    </div>
  );
}
