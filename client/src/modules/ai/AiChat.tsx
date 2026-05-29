import { useState, useRef, useEffect, useCallback } from "react";
import { useAiChat } from "./useAiChat";
import { AiSettings } from "./AiSettings";
import { useAiStore, type ChatMessage } from "@/store/aiStore";
import { cn } from "@/lib/utils";

/**
 * Tool approval card — shown when AI wants to execute a tool.
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
    <div className="mx-3 my-2 p-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-md bg-[var(--accent)]/20 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          </svg>
        </div>
        <span className="text-[11px] font-semibold text-[var(--accent)] font-[var(--font-mono)]">
          {toolLabels[tool] || tool}
        </span>
      </div>
      <pre className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-terminal)] rounded-lg p-2.5 mb-3 overflow-x-auto max-h-28 overflow-y-auto font-[var(--font-mono)] border border-[var(--border-subtle)]">
        {JSON.stringify(args, null, 2)}
      </pre>
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="flex-1 px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[var(--success)] text-[#0B0F17] hover:opacity-90 transition-opacity uppercase tracking-wide"
        >
          Approve
        </button>
        <button
          onClick={onReject}
          className="flex-1 px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-[var(--danger)]/20 text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)]/30 transition-colors uppercase tracking-wide"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

/**
 * Markdown-like rendering for assistant messages.
 */
function MarkdownContent({ content }: { content: string }) {
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
              className="my-2 p-2.5 rounded-lg bg-[var(--bg-terminal)] text-[10px] overflow-x-auto font-[var(--font-mono)] border border-[var(--border-subtle)] text-[var(--text-terminal)]"
            >
              <code>{codeContent}</code>
            </pre>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1 py-0.5 rounded bg-[var(--bg-terminal)] text-[10px] font-[var(--font-mono)] text-[var(--accent)]"
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
 * Single message in the chat.
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.toolCall) {
    return (
      <div className="mx-3 my-1.5 p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] animate-fade-in">
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] mb-1.5 font-[var(--font-mono)]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <span className="font-medium text-[var(--info)]">{message.toolCall.name}</span>
        </div>
        <pre className="text-[9px] text-[var(--text-muted)] overflow-x-auto max-h-16 overflow-y-auto font-[var(--font-mono)]">
          {JSON.stringify(message.toolCall.args, null, 2)}
        </pre>
      </div>
    );
  }

  if (message.toolResult) {
    return (
      <div className="mx-3 my-1.5 p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] animate-fade-in">
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] mb-1.5 font-[var(--font-mono)]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="font-medium text-[var(--success)]">{message.toolResult.name}</span>
        </div>
        <pre className="text-[9px] text-[var(--text-muted)] overflow-x-auto max-h-24 overflow-y-auto whitespace-pre-wrap font-[var(--font-mono)]">
          {message.toolResult.result.slice(0, 2000)}
          {message.toolResult.result.length > 2000 && "\n... (truncated)"}
        </pre>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={cn("mx-3 my-2", isUser ? "flex justify-end" : "")}>
      <div
        className={cn(
          "px-3 py-2.5 rounded-xl text-[12px] max-w-[88%] whitespace-pre-wrap break-words leading-relaxed animate-fade-in",
          isUser
            ? "bg-[var(--accent)]/15 text-[var(--text-primary)] border border-[var(--accent)]/20"
            : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]",
        )}
      >
        {isUser ? message.content : <MarkdownContent content={message.content} />}
      </div>
    </div>
  );
}

/**
 * Main AI Chat panel.
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingApproval]);

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
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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

  if (settingsOpen) return <AiSettings onClose={toggleSettings} />;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            status === "thinking" ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--success)]"
          )} />
          <span className="text-[11px] font-semibold text-[var(--text-primary)]">AI Agent</span>
          {status === "thinking" && (
            <span className="text-[9px] text-[var(--accent)] font-[var(--font-mono)] animate-shimmer px-1.5 py-0.5 rounded">
              processing
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleSettings}
            className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
            title="AI Settings"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button
            onClick={clearMessages}
            className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-tertiary)] transition-all"
            title="Clear chat"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center px-6">
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="m2 14 6-6" /><path d="m22 14-6-6" />
                </svg>
              </div>
              <div>
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">AI Agent</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-relaxed max-w-[200px] mx-auto">
                  Read files, write code, run commands, or help with your project.
                </p>
              </div>
              <button
                onClick={toggleSettings}
                className="px-3 py-1.5 text-[10px] font-medium rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)] transition-all"
              >
                Configure Provider
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {pendingApproval && (
          <ApprovalCard
            tool={pendingApproval.tool}
            args={pendingApproval.args}
            onApprove={approveToolCall}
            onReject={rejectToolCall}
          />
        )}

        {error && (
          <div className="mx-3 my-2 px-3 py-2 rounded-lg text-[10px] text-[var(--danger)] bg-[var(--danger)]/5 border border-[var(--danger)]/20 font-[var(--font-mono)]">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area — AI Composer */}
      <div className="border-t border-[var(--border-subtle)] p-2.5 shrink-0">
        <div className="flex items-end gap-2 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] focus-within:border-[var(--accent)]/40 focus-within:shadow-[0_0_12px_var(--accent-glow)] transition-all p-1.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none font-[var(--font-ui)]"
          />
          {status === "thinking" ? (
            <button
              onClick={stop}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)]/30 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || status === "awaiting-approval"}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 7-7 7 7" /><path d="M12 19V5" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
