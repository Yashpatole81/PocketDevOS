import { useState, useRef, useEffect } from "react";
import { useAiStore, type ChatMessage } from "@/store/aiStore";
import { cn } from "@/lib/utils";

// --- Constants ---

const COLLAPSIBLE_THRESHOLD = 500;

// --- Sub-components ---

/**
 * Typing indicator shown when AI is generating a response.
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3" aria-label="AI is thinking">
      <div className="flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-pulse-dot"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-pulse-dot"
          style={{ animationDelay: "200ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-pulse-dot"
          style={{ animationDelay: "400ms" }}
        />
      </div>
      <span className="text-[11px] text-[var(--color-text-muted)] font-[var(--font-mono)]">
        thinking
      </span>
    </div>
  );
}

/**
 * Renders a status update entry in the activity feed.
 */
function StatusUpdateEntry({ message }: { message: ChatMessage }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 animate-fade-in">
      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" />
      <span className="text-[11px] text-[var(--color-text-muted)] italic">
        {message.content}
      </span>
    </div>
  );
}

/**
 * Renders a tool call entry with name, arguments, and execution status.
 */
function ToolCallEntry({ message }: { message: ChatMessage }) {
  const toolCall = message.toolCall!;
  const argsString = JSON.stringify(toolCall.args, null, 2);
  const [expanded, setExpanded] = useState(argsString.length <= COLLAPSIBLE_THRESHOLD);

  return (
    <div
      className="mx-4 my-2 rounded-lg border animate-fade-in"
      style={{
        borderColor: "rgba(255, 255, 255, 0.08)",
        background: "var(--color-surface-1)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <span className="text-[11px] font-semibold text-[var(--color-text-primary)] font-[var(--font-mono)]">
          {toolCall.name}
        </span>
        <ToolCallStatusBadge status="running" />
      </div>

      {/* Arguments */}
      <div className="px-3 pb-2">
        {argsString.length > COLLAPSIBLE_THRESHOLD && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-[var(--color-accent)] hover:underline mb-1 font-[var(--font-mono)]"
          >
            {expanded ? "▼ Collapse arguments" : "▶ Show arguments"}
          </button>
        )}
        {expanded && (
          <pre className="text-[10px] text-[var(--color-text-secondary)] overflow-x-auto max-h-32 overflow-y-auto font-[var(--font-mono)] p-2 rounded bg-[var(--color-background)]">
            {argsString}
          </pre>
        )}
        {!expanded && argsString.length > COLLAPSIBLE_THRESHOLD && (
          <pre className="text-[10px] text-[var(--color-text-muted)] font-[var(--font-mono)] p-2 rounded bg-[var(--color-background)] truncate">
            {argsString.slice(0, 80)}…
          </pre>
        )}
      </div>
    </div>
  );
}

/**
 * Badge showing tool call execution status.
 */
function ToolCallStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    running: { color: "var(--color-accent)", label: "running" },
    success: { color: "var(--color-success)", label: "done" },
    failure: { color: "var(--color-danger)", label: "failed" },
    skipped: { color: "var(--color-text-muted)", label: "skipped" },
  };

  const { color, label } = config[status] || config.running;

  return (
    <span
      className="ml-auto text-[9px] font-[var(--font-mono)] px-1.5 py-0.5 rounded"
      style={{ color, border: `1px solid ${color}`, opacity: 0.8 }}
    >
      {label}
    </span>
  );
}

/**
 * Renders a tool result with syntax highlighting and collapsible sections.
 */
function ToolResultEntry({ message }: { message: ChatMessage }) {
  const toolResult = message.toolResult!;
  const resultContent = toolResult.result;
  const isLong = resultContent.length > COLLAPSIBLE_THRESHOLD;
  const [expanded, setExpanded] = useState(!isLong);

  return (
    <div
      className="mx-4 my-2 rounded-lg border animate-fade-in"
      style={{
        borderColor: "rgba(255, 255, 255, 0.08)",
        background: "var(--color-surface-1)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-[11px] font-medium text-[var(--color-success)] font-[var(--font-mono)]">
          {toolResult.name}
        </span>
        <span className="ml-auto text-[9px] text-[var(--color-text-muted)] font-[var(--font-mono)]">
          result
        </span>
      </div>

      {/* Result content */}
      <div className="px-3 pb-2">
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-[var(--color-accent)] hover:underline mb-1 font-[var(--font-mono)]"
            aria-expanded={expanded}
          >
            {expanded
              ? "▼ Collapse output"
              : `▶ Show output (${resultContent.length} chars)`}
          </button>
        )}
        {expanded ? (
          <pre className="text-[10px] text-[var(--color-text-secondary)] overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-[var(--font-mono)] p-2 rounded bg-[var(--color-background)] border border-[rgba(255,255,255,0.06)]">
            <code>{resultContent}</code>
          </pre>
        ) : (
          isLong && (
            <pre className="text-[10px] text-[var(--color-text-muted)] font-[var(--font-mono)] p-2 rounded bg-[var(--color-background)] truncate">
              {resultContent.slice(0, 120)}…
            </pre>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Renders markdown-like content for assistant text messages.
 * Handles code blocks and inline code with syntax highlighting.
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
              className="my-2 p-2.5 rounded-lg text-[10px] overflow-x-auto font-[var(--font-mono)] border"
              style={{
                background: "var(--color-background)",
                borderColor: "rgba(255, 255, 255, 0.06)",
                color: "var(--color-text-secondary)",
              }}
            >
              <code>{codeContent}</code>
            </pre>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1 py-0.5 rounded text-[10px] font-[var(--font-mono)]"
              style={{
                background: "var(--color-surface-3)",
                color: "var(--color-accent)",
              }}
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
 * Renders a text message (user or assistant).
 */
function TextMessageEntry({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("px-4 my-2", isUser ? "flex justify-end" : "")}>
      <div
        className={cn(
          "px-3 py-2.5 rounded-xl text-[12px] max-w-[88%] whitespace-pre-wrap break-words leading-relaxed animate-fade-in",
          isUser
            ? "border"
            : "border"
        )}
        style={
          isUser
            ? {
                background: "rgba(255, 255, 255, 0.05)",
                borderColor: "rgba(255, 255, 255, 0.10)",
                color: "var(--color-text-primary)",
              }
            : {
                background: "var(--color-surface-2)",
                borderColor: "rgba(255, 255, 255, 0.08)",
                color: "var(--color-text-secondary)",
              }
        }
      >
        {isUser ? message.content : <MarkdownContent content={message.content} />}
      </div>
    </div>
  );
}

// --- Main Component ---

/**
 * ActivityFeed - Linear-style activity feed for the AI Workspace.
 *
 * Renders ChatMessage items with different visual treatments based on role
 * and toolCall/toolResult fields:
 * - Text responses: user messages right-aligned, assistant messages left-aligned
 * - Tool calls: inline card with tool name, arguments, and execution status
 * - Tool results: card with syntax-highlighted output, collapsible if > 500 chars
 * - Status updates: subtle inline status text
 *
 * Shows a typing indicator when AI status is "thinking".
 * Streams AI responses token-by-token via the store's appendToLastAssistant.
 */
export function ActivityFeed() {
  const messages = useAiStore((state) => state.messages);
  const status = useAiStore((state) => state.status);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or status changes
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  return (
    <div
      className="flex-1 overflow-y-auto py-3"
      role="log"
      aria-label="AI activity feed"
      aria-live="polite"
    >
      {messages.length === 0 && status !== "thinking" && (
        <EmptyState />
      )}

      {messages.map((message) => (
        <FeedEntry key={message.id} message={message} />
      ))}

      {status === "thinking" && <TypingIndicator />}

      <div ref={feedEndRef} />
    </div>
  );
}

/**
 * Routes a ChatMessage to the appropriate visual treatment.
 */
function FeedEntry({ message }: { message: ChatMessage }) {
  // Tool call messages
  if (message.toolCall) {
    return <ToolCallEntry message={message} />;
  }

  // Tool result messages
  if (message.toolResult) {
    return <ToolResultEntry message={message} />;
  }

  // Status update messages (role "tool" without toolResult — edge case)
  if (message.role === "tool" && !message.toolResult) {
    return <StatusUpdateEntry message={message} />;
  }

  // Text messages (user or assistant)
  return <TextMessageEntry message={message} />;
}

/**
 * Empty state shown when there are no messages.
 */
function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full text-center px-6">
      <div className="space-y-4">
        <div
          className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center border"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="m2 14 6-6" />
            <path d="m22 14-6-6" />
          </svg>
        </div>
        <div>
          <p className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
            AI Workspace
          </p>
          <p
            className="text-[10px] mt-1 leading-relaxed max-w-[220px] mx-auto"
            style={{ color: "var(--color-text-muted)" }}
          >
            Start a conversation. Tool calls, results, and agent activity will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ActivityFeed;
