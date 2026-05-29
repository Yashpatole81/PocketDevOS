import { streamText, type CoreMessage, type LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { AI_TOOLS, getTool, type ToolDef } from "./tools.js";
import { SYSTEM_PROMPT, PROVIDERS } from "./config.js";
import { settingsManager } from "../services/settings.js";

export type AgentEvent =
  | { type: "text"; content: string }
  | { type: "tool-call"; id: string; name: string; args: Record<string, any> }
  | { type: "tool-result"; id: string; name: string; result: string }
  | { type: "approval-needed"; id: string; tool: string; args: Record<string, any> }
  | { type: "error"; message: string }
  | { type: "done" };

interface PendingApproval {
  id: string;
  tool: ToolDef;
  args: Record<string, any>;
  resolve: (approved: boolean) => void;
}

const pendingApprovals = new Map<string, PendingApproval>();

export function resolveApproval(sessionId: string, approved: boolean): boolean {
  const pending = pendingApprovals.get(sessionId);
  if (!pending) return false;
  pending.resolve(approved);
  pendingApprovals.delete(sessionId);
  return true;
}

function createModel(): LanguageModel {
  const settings = settingsManager.get();
  const { provider: providerId, model, baseUrl, apiKey } = settings;

  const providerConfig = PROVIDERS.find((p) => p.id === providerId);
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const effectiveBaseUrl = providerId === "custom" ? baseUrl : providerConfig.baseURL;

  if (!effectiveBaseUrl) {
    throw new Error(`No base URL configured for provider: ${providerId}`);
  }

  if (providerConfig.requiresKey && !apiKey) {
    throw new Error(`API key required for ${providerConfig.name}. Configure it in AI Settings.`);
  }

  const compatible = createOpenAICompatible({
    name: providerId,
    baseURL: effectiveBaseUrl,
    apiKey: apiKey || "no-key-needed",
  });

  return compatible.chatModel(model);
}

function buildToolDefs() {
  const tools: Record<string, any> = {};
  for (const tool of AI_TOOLS) {
    tools[tool.name] = {
      description: tool.description,
      parameters: tool.parameters,
    };
  }
  return tools;
}

export async function runAgent(
  messages: CoreMessage[],
  sessionId: string,
  emit: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const model = createModel();
    const tools = buildToolDefs();

    const conversationMessages: CoreMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      if (signal?.aborted) { emit({ type: "done" }); return; }
      iteration++;

      const result = streamText({
        model,
        messages: conversationMessages,
        tools,
        maxSteps: 1,
        abortSignal: signal,
      });

      let fullText = "";
      for await (const chunk of result.textStream) {
        if (signal?.aborted) { emit({ type: "done" }); return; }
        fullText += chunk;
        emit({ type: "text", content: chunk });
      }

      const toolCalls = await result.toolCalls;
      if (!toolCalls || toolCalls.length === 0) {
        emit({ type: "done" });
        return;
      }

      const toolResults: Array<{ toolCallId: string; toolName: string; result: string }> = [];

      for (const toolCall of toolCalls) {
        if (signal?.aborted) { emit({ type: "done" }); return; }

        const tool = getTool(toolCall.toolName);
        if (!tool) {
          const errorResult = `Error: Unknown tool "${toolCall.toolName}"`;
          toolResults.push({ toolCallId: toolCall.toolCallId, toolName: toolCall.toolName, result: errorResult });
          emit({ type: "tool-result", id: toolCall.toolCallId, name: toolCall.toolName, result: errorResult });
          continue;
        }

        emit({ type: "tool-call", id: toolCall.toolCallId, name: toolCall.toolName, args: toolCall.args as Record<string, any> });

        if (tool.needsApproval) {
          emit({ type: "approval-needed", id: toolCall.toolCallId, tool: toolCall.toolName, args: toolCall.args as Record<string, any> });

          const approved = await new Promise<boolean>((resolve) => {
            pendingApprovals.set(sessionId, {
              id: toolCall.toolCallId, tool, args: toolCall.args as Record<string, any>, resolve,
            });
          });

          if (!approved) {
            const rejectedResult = "Tool call rejected by user";
            toolResults.push({ toolCallId: toolCall.toolCallId, toolName: toolCall.toolName, result: rejectedResult });
            emit({ type: "tool-result", id: toolCall.toolCallId, name: toolCall.toolName, result: rejectedResult });
            continue;
          }
        }

        const toolResult = await tool.execute(toolCall.args);
        toolResults.push({ toolCallId: toolCall.toolCallId, toolName: toolCall.toolName, result: toolResult });
        emit({ type: "tool-result", id: toolCall.toolCallId, name: toolCall.toolName, result: toolResult });
      }

      if (fullText) {
        conversationMessages.push({ role: "assistant", content: fullText });
      }

      conversationMessages.push({
        role: "assistant",
        content: toolCalls.map((tc) => ({
          type: "tool-call" as const,
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          args: tc.args,
        })),
      });

      conversationMessages.push({
        role: "tool",
        content: toolResults.map((tr) => ({
          type: "tool-result" as const,
          toolCallId: tr.toolCallId,
          toolName: tr.toolName,
          result: tr.result,
        })),
      });
    }

    emit({ type: "text", content: "\n\n(Reached maximum tool call iterations)" });
    emit({ type: "done" });
  } catch (err: any) {
    if (err.name === "AbortError") {
      emit({ type: "done" });
    } else {
      emit({ type: "error", message: err.message || "Unknown error" });
    }
  }
}
