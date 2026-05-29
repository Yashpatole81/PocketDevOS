import { spawn, type ChildProcess } from "node:child_process";
import { platform } from "node:os";

export interface PtySession {
  id: string;
  process: ChildProcess;
  cols: number;
  rows: number;
  createdAt: number;
  dataListeners: Set<(data: string) => void>;
  exitListeners: Set<(code: number) => void>;
}

/**
 * Manages terminal sessions using child_process.
 * Works on Termux (Android), Linux, macOS, and Windows without native compilation.
 */
export class PtyManager {
  private sessions: Map<string, PtySession> = new Map();
  private nextId = 1;

  private getDefaultShell(): string {
    const shell = process.env.SHELL;
    if (shell) return shell;
    if (platform() === "win32") return "powershell.exe";
    return "/bin/bash";
  }

  /**
   * Create a new terminal session.
   */
  create(options: {
    cols?: number;
    rows?: number;
    cwd?: string;
  }): { id: string; cols: number; rows: number } {
    const id = String(this.nextId++);
    const cols = options.cols || 80;
    const rows = options.rows || 24;
    const cwd = options.cwd || process.env.HOME || "/";
    const shell = this.getDefaultShell();

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      COLUMNS: String(cols),
      LINES: String(rows),
      POCKETDEVOS: "1",
    };

    // Use script command to allocate a PTY on Unix systems (works on Termux)
    let proc: ChildProcess;

    if (platform() === "win32") {
      proc = spawn(shell, [], {
        cwd,
        env,
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else {
      // Use 'script' to allocate a real PTY — works on Termux without node-pty
      // script -q /dev/null wraps the shell in a PTY
      const scriptCmd = platform() === "darwin"
        ? ["script", "-q", "/dev/null", shell]
        : ["script", "-qc", shell, "/dev/null"];

      proc = spawn(scriptCmd[0], scriptCmd.slice(1), {
        cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });
    }

    const dataListeners = new Set<(data: string) => void>();
    const exitListeners = new Set<(code: number) => void>();

    // Forward stdout
    proc.stdout?.on("data", (chunk: Buffer) => {
      const str = chunk.toString();
      for (const listener of dataListeners) {
        listener(str);
      }
    });

    // Forward stderr
    proc.stderr?.on("data", (chunk: Buffer) => {
      const str = chunk.toString();
      for (const listener of dataListeners) {
        listener(str);
      }
    });

    // Handle exit
    proc.on("exit", (code) => {
      for (const listener of exitListeners) {
        listener(code ?? 0);
      }
      this.sessions.delete(id);
    });

    proc.on("error", (err) => {
      for (const listener of dataListeners) {
        listener(`\r\n[Error: ${err.message}]\r\n`);
      }
    });

    const session: PtySession = {
      id,
      process: proc,
      cols,
      rows,
      createdAt: Date.now(),
      dataListeners,
      exitListeners,
    };

    this.sessions.set(id, session);
    return { id, cols, rows };
  }

  /**
   * Get a session by ID.
   */
  get(id: string): PtySession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Register a data listener (output from terminal).
   */
  onData(id: string, listener: (data: string) => void): (() => void) | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    session.dataListeners.add(listener);
    return () => { session.dataListeners.delete(listener); };
  }

  /**
   * Register an exit listener.
   */
  onExit(id: string, listener: (code: number) => void): (() => void) | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    session.exitListeners.add(listener);
    return () => { session.exitListeners.delete(listener); };
  }

  /**
   * Write data to a terminal session (user input).
   */
  write(id: string, data: string): boolean {
    const session = this.sessions.get(id);
    if (!session || !session.process.stdin?.writable) return false;
    session.process.stdin.write(data);
    return true;
  }

  /**
   * Resize a terminal session.
   * Note: Without node-pty, resize signals are limited.
   * We send SIGWINCH-equivalent via environment on next command.
   */
  resize(id: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.cols = cols;
    session.rows = rows;
    // Send resize escape sequence that some shells understand
    if (session.process.stdin?.writable) {
      // stty approach: write resize command to the shell
      session.process.stdin.write(`stty cols ${cols} rows ${rows} 2>/dev/null\n`);
    }
    return true;
  }

  /**
   * Kill and remove a terminal session.
   */
  kill(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.process.kill("SIGTERM");
    this.sessions.delete(id);
    return true;
  }

  /**
   * Kill all sessions.
   */
  killAll(): void {
    for (const [id] of this.sessions) {
      this.kill(id);
    }
  }

  /**
   * List all active sessions.
   */
  list(): Array<{ id: string; cols: number; rows: number; createdAt: number }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      cols: s.cols,
      rows: s.rows,
      createdAt: s.createdAt,
    }));
  }
}

export const ptyManager = new PtyManager();

process.on("exit", () => ptyManager.killAll());
