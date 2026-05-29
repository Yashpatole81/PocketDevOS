import * as pty from "node-pty";
import { platform } from "node:os";

export interface PtySession {
  id: string;
  process: pty.IPty;
  cols: number;
  rows: number;
  createdAt: number;
}

/**
 * Manages PTY (pseudo-terminal) sessions.
 * Each terminal tab in the frontend corresponds to one PTY session.
 */
export class PtyManager {
  private sessions: Map<string, PtySession> = new Map();
  private nextId = 1;

  /**
   * Detect the user's default shell.
   */
  private getDefaultShell(): string {
    const shell = process.env.SHELL;
    if (shell) return shell;
    if (platform() === "win32") return "powershell.exe";
    return "/bin/bash";
  }

  /**
   * Create a new PTY session.
   */
  create(options: {
    cols?: number;
    rows?: number;
    cwd?: string;
  }): PtySession {
    const id = String(this.nextId++);
    const cols = options.cols || 80;
    const rows = options.rows || 24;
    const cwd = options.cwd || process.env.HOME || "/";

    const shell = this.getDefaultShell();

    const proc = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        POCKETDEVOS: "1",
      } as Record<string, string>,
    });

    const session: PtySession = {
      id,
      process: proc,
      cols,
      rows,
      createdAt: Date.now(),
    };

    this.sessions.set(id, session);
    return session;
  }

  /**
   * Get a session by ID.
   */
  get(id: string): PtySession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Write data to a PTY session (user input).
   */
  write(id: string, data: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.process.write(data);
    return true;
  }

  /**
   * Resize a PTY session.
   */
  resize(id: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.process.resize(cols, rows);
    session.cols = cols;
    session.rows = rows;
    return true;
  }

  /**
   * Kill and remove a PTY session.
   */
  kill(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.process.kill();
    this.sessions.delete(id);
    return true;
  }

  /**
   * Kill all sessions (cleanup on shutdown).
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

// Cleanup on process exit
process.on("exit", () => ptyManager.killAll());
