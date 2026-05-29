import { useCallback, useRef, useEffect } from "react";
import { useAiStore, type ChatMessage } from "@/store/aiStore";
import { ai } from "@/lib/api";

/**
 * Hook for managing AI chat interactions via SSE.
 */
export function useAiChat() {
  const {
    messages,
    status,
    pendingApproval,
    provider,
    model,
    sessionId,
    error,
    addMessage,
    appendToLastAssistant,
    setStatus,
    setPendingApproval,
    setProvider,
    setModel,
    setBaseUrl,
    setError,
    clearMessages,
  } = useAiStore();

  const abortRef = useRef<AbortController | null>(null);

  // Load config from server on mount
  useEffect(() => {
    ai.getConfig()
      .then((config) => {
        setProvider(config.current.provider as any);
        setModel(config.current.model);
        setBaseUrl(config.current.baseUrl);
      })
      .catch(() => {
        // Use defaults if server is unreachable
      });
  }, [setProvider, setModel, setBaseUrl]);

  /**
   * Send a message to the AI and stream the response.
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || status === "thinking") return;

      // Add user message
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };
      addMessage(userMessage);
      setStatus("thinking");
      setError(null);

      // Prepare messages for API (only user/assistant text messages)
      const apiMessages = [...useAiStore.getState().messages]
        .filter((m) => (m.role === "user" || m.role === "assistant") && !m.toolCall && !m.toolResult)
        .map((m) => ({ role: m.role, content: m.content }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await ai.chat(apiMessages, sessionId, controller.signal);

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Request failed" }));
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        // Read SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);
              handleEvent(event);
            } catch {
              // Skip malformed events
            }
          }
        }

        // Process remaining buffer
        if (buffer.startsWith("data: ")) {
          const data = buffer.slice(6).trim();
          if (data) {
            try {
              const event = JSON.parse(data);
              handleEvent(event);
            } catch {
              // Skip
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          setStatus("idle");
        } else {
          setError(err.message || "Failed to send message");
        }
      } finally {
        abortRef.current = null;
        // Only set idle if not awaiting approval
        if (useAiStore.getState().status === "thinking") {
          setStatus("idle");
        }
      }
    },
    [status, sessionId, addMessage, appendToLastAssistant, setStatus, setError],
  );

  /**
   * Handle an SSE event from the server.
   */
  function handleEvent(event: any) {
    switch (event.type) {
      case "text":
        appendToLastAssistant(event.content);
        break;

      case "tool-call":
        addMessage({
          id: event.id,
          role: "assistant",
          content: "",
          toolCall: {
            id: event.id,
            name: event.name,
            args: event.args,
          },
          timestamp: Date.now(),
        });
        break;

      case "tool-result":
        addMessage({
          id: `result_${event.id}`,
          role: "tool",
          content: event.result,
          toolResult: {
            id: event.id,
            name: event.name,
            result: event.result,
          },
          timestamp: Date.now(),
        });
        break;

      case "approval-needed":
        setStatus("awaiting-approval");
        setPendingApproval({
          id: event.id,
          tool: event.tool,
          args: event.args,
        });
        break;

      case "error":
        setError(event.message);
        break;

      case "done":
        if (useAiStore.getState().status !== "awaiting-approval") {
          setStatus("idle");
        }
        break;
    }
  }

  /**
   * Approve a pending tool call.
   */
  const approveToolCall = useCallback(async () => {
    try {
      await ai.approve(sessionId);
      setPendingApproval(null);
      setStatus("thinking");
    } catch (err: any) {
      setError(err.message);
    }
  }, [sessionId, setPendingApproval, setStatus, setError]);

  /**
   * Reject a pending tool call.
   */
  const rejectToolCall = useCallback(async () => {
    try {
      await ai.reject(sessionId);
      setPendingApproval(null);
      setStatus("thinking");
    } catch (err: any) {
      setError(err.message);
    }
  }, [sessionId, setPendingApproval, setStatus, setError]);

  /**
   * Stop the current AI generation.
   */
  const stop = useCallback(async () => {
    // Abort the fetch
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    // Also tell the server to stop
    try {
      await ai.stop(sessionId);
    } catch {
      // Best effort
    }

    setStatus("idle");
  }, [sessionId, setStatus]);

  return {
    messages,
    status,
    pendingApproval,
    provider,
    model,
    error,
    sendMessage,
    approveToolCall,
    rejectToolCall,
    stop,
    clearMessages,
  };
}
