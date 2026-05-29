import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

import { generateAuthToken, authHook } from "./lib/auth.js";
import { fsRoutes } from "./routes/fs.js";
import { terminalRoutes } from "./routes/terminal.js";
import { shellRoutes } from "./routes/shell.js";
import { aiRoutes } from "./routes/ai.js";

// Fallback for Node < 21 which lacks import.meta.dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = "127.0.0.1";

const app = Fastify({ logger: true });

// Auth token generated on startup
const AUTH_TOKEN = generateAuthToken();

// Register plugins
await app.register(cors, { origin: true });
await app.register(fastifyWebsocket);

// Serve client build (production)
const clientDist = resolve(__dirname, "../../client/dist");
if (existsSync(clientDist)) {
  await app.register(fastifyStatic, {
    root: clientDist,
    prefix: "/",
  });
}

// Auth hook for API routes
app.addHook("onRequest", authHook(AUTH_TOKEN));

// Register route modules
await app.register(fsRoutes, { prefix: "/api/fs" });
await app.register(terminalRoutes, { prefix: "/api/terminal" });
await app.register(shellRoutes, { prefix: "/api/shell" });
await app.register(aiRoutes, { prefix: "/api/ai" });

// Health check (no auth required - handled in authHook)
app.get("/api/health", async () => ({ status: "ok", version: "0.1.0" }));

// Workspace info (returns the default workspace path for this platform)
app.get("/api/workspace", async () => {
  const { homedir } = await import("node:os");
  return { home: homedir().replace(/\\/g, "/") };
});

// Start server
try {
  await app.listen({ port: PORT, host: HOST });
  console.log("\n");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║           PocketDevOS is running             ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  URL:   http://${HOST}:${PORT}              ║`);
  console.log(`║  Token: ${AUTH_TOKEN}  ║`);
  console.log("╚══════════════════════════════════════════════╝");
  console.log("\n  Open the URL in your browser to start coding.\n");
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Graceful shutdown
const shutdown = async () => {
  console.log("\nShutting down...");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
