import type { FastifyInstance } from "fastify";
import { runAgent, resolveApproval, type AgentEvent } from "../ai/agent.js";
import { MODELS, PROVIDERS } from "../ai/config.js";
import { settingsManager } from "../services/settings.js";
import type { CoreMessage } from "ai";

export async function aiRoutes(app: FastifyInstance) {
  const activeControllers = new Map<string, AbortController>();

  app.get("/config", async () => {
    const settings = settingsManager.get();
    return {
      providers: PROVIDERS,
      models: MODELS,
      current: {
        provider: settings.provider,
        model: settings.model,
        baseUrl: settings.baseUrl,
        hasKey: !!settings.apiKey,
      },
    };
  });

  app.post<{ Body: { provider?: string; model?: string; baseUrl?: string; apiKey?: string } }>(
    "/config",
    async (request, reply) => {
      const { provider, model, baseUrl, apiKey } = request.body;
      const update: Record<string, any> = {};
      if (provider !== undefined) update.provider = provider;
      if (model !== undefined) update.model = model;
      if (baseUrl !== undefined) update.baseUrl = baseUrl;
      if (apiKey !== undefined) update.apiKey = apiKey;
      if (Object.keys(update).length === 0) {
        return reply.code(400).send({ error: "No settings to update" });
      }
      const settings = settingsManager.update(update);
      return { ok: true, current: { provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl, hasKey: !!settings.apiKey } };
    },
  );

  app.post<{ Body: { messages: Array<{ role: string; content: string }>; sessionId: string } }>(
    "/chat",
    async (request, reply) => {
      const { messages, sessionId } = request.body;
      if (!messages || !sessionId) {
        return reply.code(400).send({ error: "messages and sessionId required" });
      }
      const existing = activeControllers.get(sessionId);
      if (existing) { existing.abort(); activeControllers.delete(sessionId); }
      const controller = new AbortController();
      activeControllers.set(sessionId, controller);

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });

      const emit = (event: AgentEvent) => {
        if (reply.raw.destroyed) return;
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      const coreMessages: CoreMessage[] = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      try {
        await runAgent(coreMessages, sessionId, emit, controller.signal);
      } catch (err: any) {
        emit({ type: "error", message: err.message });
      } finally {
        activeControllers.delete(sessionId);
        if (!reply.raw.destroyed) reply.raw.end();
      }
    },
  );

  app.post<{ Body: { sessionId: string } }>("/approve", async (request, reply) => {
    const { sessionId } = request.body;
    if (!sessionId) return reply.code(400).send({ error: "sessionId required" });
    const resolved = resolveApproval(sessionId, true);
    if (!resolved) return reply.code(404).send({ error: "No pending approval" });
    return { ok: true };
  });

  app.post<{ Body: { sessionId: string } }>("/reject", async (request, reply) => {
    const { sessionId } = request.body;
    if (!sessionId) return reply.code(400).send({ error: "sessionId required" });
    const resolved = resolveApproval(sessionId, false);
    if (!resolved) return reply.code(404).send({ error: "No pending approval" });
    return { ok: true };
  });

  app.post<{ Body: { sessionId: string } }>("/stop", async (request, reply) => {
    const { sessionId } = request.body;
    if (!sessionId) return reply.code(400).send({ error: "sessionId required" });
    const controller = activeControllers.get(sessionId);
    if (controller) { controller.abort(); activeControllers.delete(sessionId); return { ok: true, stopped: true }; }
    return { ok: true, stopped: false };
  });
}
