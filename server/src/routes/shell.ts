import type { FastifyInstance } from "fastify";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MAX_OUTPUT_BYTES = 256 * 1024; // 256KB
const DEFAULT_TIMEOUT_MS = 30_000;   // 30 seconds
const MAX_TIMEOUT_MS = 300_000;      // 5 minutes

/**
 * Shell routes: one-shot command execution (for AI tools).
 * NOT for interactive use - that's what the terminal/PTY is for.
 */
export async function shellRoutes(app: FastifyInstance) {
  // Run a one-shot command
  app.post<{
    Body: {
      command: string;
      cwd?: string;
      timeout?: number;
    };
  }>("/run", async (request, reply) => {
    const { command, cwd, timeout } = request.body;

    if (!command || !command.trim()) {
      return reply.code(400).send({ error: "command required" });
    }

    const timeoutMs = Math.min(timeout || DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
    const shell = process.env.SHELL || "/bin/sh";

    try {
      const { stdout, stderr } = await execFileAsync(shell, ["-c", command], {
        cwd: cwd || process.env.HOME || "/",
        timeout: timeoutMs,
        maxBuffer: MAX_OUTPUT_BYTES,
        env: { ...process.env, TERM: "dumb" },
      });

      return {
        stdout,
        stderr,
        exitCode: 0,
        timedOut: false,
        truncated: false,
      };
    } catch (err: any) {
      // Command failed but still ran
      if (err.killed) {
        return {
          stdout: err.stdout || "",
          stderr: err.stderr || "",
          exitCode: null,
          timedOut: true,
          truncated: false,
        };
      }

      return {
        stdout: err.stdout || "",
        stderr: err.stderr || err.message || "",
        exitCode: err.code ?? 1,
        timedOut: false,
        truncated:
          (err.stdout?.length || 0) >= MAX_OUTPUT_BYTES ||
          (err.stderr?.length || 0) >= MAX_OUTPUT_BYTES,
      };
    }
  });
}
