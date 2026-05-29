import type { FastifyInstance } from "fastify";
import { ptyManager } from "../services/pty.js";

/**
 * Terminal routes: create/list/kill PTY sessions.
 * Actual I/O streaming happens over WebSocket (see ws/terminal.ts).
 */
export async function terminalRoutes(app: FastifyInstance) {
  // Create a new terminal session
  app.post<{
    Body: { cols?: number; rows?: number; cwd?: string };
  }>("/create", async (request) => {
    const { cols, rows, cwd } = request.body || {};
    const session = ptyManager.create({ cols, rows, cwd });
    return { id: session.id, cols: session.cols, rows: session.rows };
  });

  // List all active sessions
  app.get("/list", async () => {
    return { sessions: ptyManager.list() };
  });

  // Resize a terminal
  app.post<{
    Params: { id: string };
    Body: { cols: number; rows: number };
  }>("/:id/resize", async (request, reply) => {
    const { id } = request.params;
    const { cols, rows } = request.body;
    const ok = ptyManager.resize(id, cols, rows);
    if (!ok) return reply.code(404).send({ error: "Session not found" });
    return { ok: true };
  });

  // Kill a terminal session
  app.delete<{
    Params: { id: string };
  }>("/:id", async (request, reply) => {
    const { id } = request.params;
    const ok = ptyManager.kill(id);
    if (!ok) return reply.code(404).send({ error: "Session not found" });
    return { ok: true };
  });

  // WebSocket endpoint for terminal I/O
  app.get<{
    Params: { id: string };
  }>("/:id/ws", { websocket: true }, (socket, request) => {
    const { id } = request.params;
    const session = ptyManager.get(id);

    if (!session) {
      socket.close(4004, "Session not found");
      return;
    }

    // PTY output -> WebSocket -> client (xterm.js)
    const onData = session.process.onData((data: string) => {
      if (socket.readyState === 1) {
        socket.send(data);
      }
    });

    // PTY exit -> notify client
    const onExit = session.process.onExit(({ exitCode }) => {
      if (socket.readyState === 1) {
        socket.send(`\r\n[Process exited with code ${exitCode}]\r\n`);
        socket.close(1000, "Process exited");
      }
    });

    // Client input -> PTY stdin
    socket.on("message", (data: Buffer | string) => {
      const str = typeof data === "string" ? data : data.toString();

      // Handle resize messages (JSON with type: "resize")
      if (str.startsWith("{")) {
        try {
          const msg = JSON.parse(str);
          if (msg.type === "resize" && msg.cols && msg.rows) {
            ptyManager.resize(id, msg.cols, msg.rows);
            return;
          }
        } catch {
          // Not JSON, treat as terminal input
        }
      }

      session.process.write(str);
    });

    // Cleanup on disconnect
    socket.on("close", () => {
      onData.dispose();
      onExit.dispose();
    });
  });
}
