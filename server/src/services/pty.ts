import { spawn, type ChildProcess } from "node:child_process";
import { platform, homedir } from "node:os";

export interface PtySession {
  id: string;
  process: ChildProcess;
  cols: number;
  rows: number;
  createdAt: number;
  dataListeners: Set<(data: string) => void>;
  exitListeners: Set<(code: number) => void>;
  alive: boolean;
}

/**
 * Manages terminal sessions using child_process + script(1) for PTY allocation.
 * Works on Termux (Android), Linux, macOS, and Windows without native modules.
 */
export class PtyManager {
  private sessions: Map<string, PtySession> = new Map();
  private nextId = 1;

  private getDefaultShell(): string {
    const shell = process.env.SHELL;
    if (shell) return shell;
    if (platform() === "win32") return "powershell.exe";
    return "/bin/sh";
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
    const cwd = options.cwd || process.env.HOME || homedir() || "/";
    const shell = this.getDefaultShell();

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      COLUMNS: String(cols),
      LINES: String(rows),
      POCKETDEVOS: "1",
    };

    let proc: ChildProcess;
    const os = platform();

    if (os === "win32") {
      // Windows: spawn shell directly (no PTY, but functional)
      proc = spawn(shell, [], {
        cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: false,
      });
    } else {
      // Unix/Termux: spawn shell directly with pipe stdio
      // This gives us a working interactive shell without node-pty
      proc = spawn(shell, ["-i"], {
        cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });
    }

    const dataListeners = new Set<(data: string) => void>();
    const exitListeners = new Set<(code: number) => void>();

    const session: PtySession = {
      id,
      process: proc,
      cols,
      rows,
      createdAt: Date.now(),
      dataListeners,
      exitListeners,
      alive: true,
    };

    // Forward stdout
    proc.stdout?.setEncoding("utf8");
    proc.stdout?.on("data", (chunk: string) => {
      for (const listener of dataListeners) {
        listener(chunk);
      }
    });

    // Forward stderr
    proc.stderr?.setEncoding("utf8");
    proc.stderr?.on("data", (chunk: string) => {
      for (const listener of dataListeners) {
        listener(chunk);
      }
    });

    // Handle exit
    proc.on("exit", (code) => {
      session.alive = false;
      for (const listener of exitListeners) {
        listener(code ?? 0);
      }
      this.sessions.delete(id);
    });

    proc.on("error", (err) => {
      session.alive = false;
      for (const listener of dataListeners) {
        listener(`\r\n[Error: ${err.message}]\r\n`);
      }
      this.sessions.delete(id);
    });

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
    if (!session || !session.alive) return false;
    if (!session.process.stdin?.writable) return false;
    try {
      session.process.stdin.write(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resize a terminal session.
   */
  resize(id: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.cols = cols;
    session.rows = rows;
    return true;
  }

  /**
   * Kill and remove a terminal session.
   */
  kill(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.alive = false;
    try {
      session.process.kill("SIGTERM");
    } catch {
      // already dead
    }
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
process.on("SIGINT", () => { ptyManager.killAll(); process.exit(0); });
process.on("SIGTERM", () => { ptyManager.killAll(); process.exit(0); });
