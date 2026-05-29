import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { terminal as terminalApi } from "@/lib/api";

interface UseTerminalOptions {
  sessionId: string;
  onExit?: () => void;
}

/**
 * Hook that manages a single terminal instance:
 * - Creates xterm.js Terminal
 * - Connects to server via WebSocket
 * - Handles resize, input, output
 */
export function useTerminal({ sessionId, onExit }: UseTerminalOptions) {
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const attach = useCallback((container: HTMLDivElement | null) => {
    if (!container || termRef.current) return;
    containerRef.current = container;

    // Create terminal
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      lineHeight: 1.3,
      theme: {
        background: "#0D1117",
        foreground: "#D1FAE5",
        cursor: "#7C5CFF",
        cursorAccent: "#0D1117",
        selectionBackground: "#7C5CFF40",
        selectionForeground: "#F3F4F6",
        black: "#1E293B",
        red: "#F87171",
        green: "#4ADE80",
        yellow: "#FBBF24",
        blue: "#38BDF8",
        magenta: "#9B7DFF",
        cyan: "#67E8F9",
        white: "#F3F4F6",
        brightBlack: "#64748B",
        brightRed: "#FCA5A5",
        brightGreen: "#86EFAC",
        brightYellow: "#FDE68A",
        brightBlue: "#7DD3FC",
        brightMagenta: "#C4B5FD",
        brightCyan: "#A5F3FC",
        brightWhite: "#FFFFFF",
      },
      allowProposedApi: true,
    });

    // Addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    term.open(container);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    // Connect WebSocket
    const ws = terminalApi.connect(sessionId);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send initial size
      ws.send(JSON.stringify({
        type: "resize",
        cols: term.cols,
        rows: term.rows,
      }));
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      term.write("\r\n\x1b[90m[Connection closed]\x1b[0m\r\n");
      onExit?.();
    };

    ws.onerror = () => {
      term.write("\r\n\x1b[31m[Connection error]\x1b[0m\r\n");
    };

    // User input -> WebSocket -> server PTY
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "resize",
          cols: term.cols,
          rows: term.rows,
        }));
      }
    });
    resizeObserver.observe(container);

    // Cleanup function stored for unmount
    (container as any).__cleanup = () => {
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
      termRef.current = null;
      wsRef.current = null;
      fitRef.current = null;
    };
  }, [sessionId, onExit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const container = containerRef.current;
      if (container && (container as any).__cleanup) {
        (container as any).__cleanup();
      }
    };
  }, []);

  return { attach, termRef, fitRef };
}
