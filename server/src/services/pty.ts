import { spawn, execSync, type ChildProcess } from "node:child_process";
import { platform, homedir } from "node:os";
import { existsSync } from "node:fs";

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
 * Detect if running inside Termux.
 */
function isTermux(): boolean {
  return existsSync("/data/data/com.termux/files/usr/bin/bash");
}

/**
 * Manages terminal sessions.
 * Uses `script` command to allocate a real PTY on Unix/Termux.
 * Falls back to direct shell spawn on Windows.
 */
export class PtyManager {
  private sessions: Map<string, PtySession> = new Map();
  private nextId = 1;

  private getDefaultShell(): string {
    if (process.env.SHELL) return process.env.SHELL;
    if (isTermux()) return "/data/data/com.termux/files/usr/bin/bash";
    if (platform() === "win32") return "powershell.exe";
    return "/bin/bash";
  }

  /**
   * Create a new terminal session with a real PTY via `script`.
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
      proc = spawn(shell, [], {
        cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else if (os === "darwin") {
      // macOS: script -q /dev/null shell
      proc = spawn("script", ["-q", "/dev/null", shell], {
        cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else {
      // Linux/Termux: script -qfc "shell" /dev/null
      // The -f flag flushes output immediately
      proc = spawn("script", ["-qfc", shell, "/dev/null"], {
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

    // Forward stderr to same output
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
        listener(`\r\n\x1b[31m[Error: ${err.message}]\x1b[0m\r\n`);
      }
      this.sessions.delete(id);
    });

    this.sessions.set(id, session);
    return { id, cols, rows };
  }

  get(id: string): PtySession | undefined {
    return this.sessions.get(id);
  }

  onData(id: string, listener: (data: string) => void): (() => void) | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    session.dataListeners.add(listener);
    return () => { session.dataListeners.delete(listener); };
  }

  onExit(id: string, listener: (code: number) => void): (() => void) | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    session.exitListeners.add(listener);
    return () => { session.exitListeners.delete(listener); };
  }

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

  resize(id: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(id);
    if (!session || !session.alive) return false;
    session.cols = cols;
    session.rows = rows;
    // Send resize to the PTY via stty
    try {
      if (session.process.stdin?.writable) {
        // Use ANSI escape to resize — some terminals respond to this
        const resizeSeq = `\x1b[8;${rows};${cols}t`;
        session.process.stdin.write(resizeSeq);
      }
    } catch {
      // ignore
    }
    return true;
  }

  kill(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.alive = false;
    try {
      session.process.kill("SIGKILL");
    } catch {
      // already dead
    }
    this.sessions.delete(id);
    return true;
  }

  killAll(): void {
    for (const [id] of this.sessions) {
      this.kill(id);
    }
  }

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
