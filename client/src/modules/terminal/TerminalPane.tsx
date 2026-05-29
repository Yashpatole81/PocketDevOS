import { useTerminal } from "./useTerminal";

interface TerminalPaneProps {
  sessionId: string;
  onExit?: () => void;
}

/**
 * A single terminal pane that renders xterm.js and connects to a PTY session.
 */
export function TerminalPane({ sessionId, onExit }: TerminalPaneProps) {
  const { attach } = useTerminal({ sessionId, onExit });

  return (
    <div
      ref={attach}
      className="terminal-container w-full h-full"
    />
  );
}
