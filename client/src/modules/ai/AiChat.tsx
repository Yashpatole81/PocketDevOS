import { useState, useRef, useEffect, useCallback } from "react";
import { useAiChat } from "./useAiChat";
import { AiSettings } from "./AiSettings";
import { useAiStore, type ChatMessage } from "@/store/aiStore";
import { cn } from "@/lib/utils";

/**
 * Tool approval card - shown when AI wants to execute a tool that needs permission.
 */
function ApprovalCard({
  tool,
  args,
  onApprove,
  onReject,
}: {
  tool: string;
  args: Record<string, any>;
  onApprove: () => void;
  onReject: () => void;
}) {
  const toolLabels: Record<string, string> = {
    write_file: "Write File",
    edit_file: "Edit File",
    run_command: "Run Command",
  };

  return (
    <div className="mx-2 my-2 p-3 rounded-lg border border-[var(--accent)]/50 bg-[var(--accent)]/10">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-[var(--accent)]">
          🔐 {toolLabels[tool] || tool}
        </span>
      </div>
      <pre className="text-xs text-[var(--text-secondary)] bg-[var(--bg-primary)] rounded p-2 mb-3 overflow-x-auto max-h-32 overflow-y-auto">
        {JSON.stringify(args, null, 2)}
      </pre>
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-[var(--success)] text-white hover:opacity-90 transition-opacity"
        >
          ✓ Approve
        </button>
        <button
          onClick={onReject}
          className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-[var(--danger)] text-white hover:opacity-90 transition-opacity"
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}

/**
 * Simple markdown-like rendering for assistant messages.
 */
function MarkdownContent({ content }: { content: string }) {
  // Simple rendering: code blocks, inline code, bold, links
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3);
          const firstNewline = code.indexOf("\n");
          const codeContent = firstNewline >= 0 ? code.slice(firstNewline + 1) : code;
          return (
            <pre
              key={i}
              className="my-1.5 p-2 rounded bg-[var(--bg-primary)] text-xs overflow-x-auto"
            >
              <code>{codeContent}</code>
            </pre>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1 py-0.5 rounded bg-[var(--bg-primary)] text-xs"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/**
 * Single message bubble in the chat.
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.toolCall) {
    return (
      <div className="mx-2 my-1 p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-1">
          <span>🔧</span>
          <span className="font-medium">{message.toolCall.name}</span>
        </div>
        <pre className="text-xs text-[var(--text-secondary)] overflow-x-auto max-h-20 overflow-y-auto">
          {JSON.stringify(message.toolCall.args, null, 2)}
        </pre>
      </div>
    );
  }

  if (message.toolResult) {
    return (
      <div className="mx-2 my-1 p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border)]">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-1">
          <span>📋</span>
          <span className="font-medium">Result: {message.toolResult.name}</span>
        </div>
        <pre className="text-xs text-[var(--text-secondary)] overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
          {message.toolResult.result.slice(0, 2000)}
          {message.toolResult.result.length > 2000 && "\n... (truncated)"}
        </pre>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={cn("mx-2 my-1.5", isUser ? "flex justify-end" : "")}>
      <div
        className={cn(
          "px-3 py-2 rounded-lg text-sm max-w-[90%] whitespace-pre-wrap break-words",
          isUser
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--bg-tertiary)] text-[var(--text-primary)]",
        )}
      >
        {isUser ? message.content : <MarkdownContent content={message.content} />}
      </div>
    </div>
  );
}

/**
 * Main AI Chat panel component.
 */
export function AiChat() {
  const {
    messages,
    status,
    pendingApproval,
    error,
    sendMessage,
    approveToolCall,
    rejectToolCall,
    stop,
    clearMessages,
  } = useAiChat();

  const { settingsOpen, toggleSettings } = useAiStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingApproval]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = useCallback(() => {
    if (!input.trim() || status === "thinking") return;
    sendMessage(input);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, status, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Show settings panel
  if (settingsOpen) {
    return <AiSettings onClose={toggleSettings} />;
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between h-9 px-3 border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-medium text-[var(--text-primary)]">AI Agent</span>
        <div className="flex items-center gap-1">
          {status === "thinking" && (
            <span className="text-[10px] text-[var(--accent)] animate-pulse">thinking...</span>
          )}
          <button
            onClick={toggleSettings}
            className="px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="AI Settings"
          >
            ⚙️
          </button>
          <button
            onClick={clearMessages}
            className="px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Clear chat"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center px-4">
            <div className="text-[var(--text-secondary)]">
              <p className="text-sm mb-1">PocketDevOS AI</p>
              <p className="text-xs">Ask me to read files, write code, run commands, or help with your project.</p>
              <button
                onClick={toggleSettings}
                className="mt-3 px-3 py-1.5 text-xs rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
              >
                ⚙️ Configure AI Provider
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Pending approval card */}
        {pendingApproval && (
          <ApprovalCard
            tool={pendingApproval.tool}
            args={pendingApproval.args}
            onApprove={approveToolCall}
            onReject={rejectToolCall}
          />
        )}

        {/* Error display */}
        {error && (
          <div className="mx-2 my-1 px-3 py-2 rounded text-xs text-[var(--danger)] bg-[var(--danger)]/10">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--border)] p-2 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 resize-none bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          {status === "thinking" ? (
            <button
              onClick={stop}
              className="shrink-0 px-3 py-2 rounded-lg bg-[var(--danger)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || status === "awaiting-approval"}
              className="shrink-0 px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
