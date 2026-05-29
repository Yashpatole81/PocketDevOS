import { randomBytes } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Generate a random auth token for this server session.
 * Prevents other apps on the device from accessing the server.
 */
export function generateAuthToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Fastify hook that validates the auth token on all API requests.
 * Skips auth for: health check, static files, WebSocket upgrade (token in query).
 */
export function authHook(token: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { url } = request;

    // Skip auth for static files and health check
    if (url === "/api/health" || !url.startsWith("/api/")) {
      return;
    }

    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader === `Bearer ${token}`) {
      return;
    }

    // Check query param (for WebSocket connections)
    const query = request.query as Record<string, string>;
    if (query.token === token) {
      return;
    }

    reply.code(401).send({ error: "Unauthorized" });
  };
}
