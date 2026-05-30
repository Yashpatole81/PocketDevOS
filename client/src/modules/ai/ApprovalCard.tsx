import { useAiStore } from "@/store/aiStore";

/**
 * ApprovalCard - Displays a tool approval request with Approve/Reject buttons.
 *
 * Used inline in the AI activity feed when the agent requires user approval
 * before executing a tool. Both buttons are 44px minimum touch targets per
 * mobile accessibility requirements.
 *
 * Validates: Requirements 2.5
 */

export interface ApprovalCardProps {
  toolName: string;
  args: Record<string, unknown>;
  onApprove: () => void;
  onReject: () => void;
}

/**
 * Formats tool arguments into a concise summary string.
 * Shows key=value pairs, truncating long values.
 */
function formatArgsSummary(args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) return "No arguments";

  return entries
    .map(([key, value]) => {
      const strValue = typeof value === "string" ? value : JSON.stringify(value);
      const truncated = strValue.length > 60 ? strValue.slice(0, 57) + "..." : strValue;
      return `${key}: ${truncated}`;
    })
    .join("\n");
}

export function ApprovalCard({ toolName, args, onApprove, onReject }: ApprovalCardProps) {
  return (
    <div
      className="rounded-lg p-4 my-3 mx-0"
      style={{
        backgroundColor: "var(--color-surface-2)",
        border: "var(--border-default)",
      }}
    >
      {/* Tool name header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: "var(--color-surface-3)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          </svg>
        </div>
        <span
          className="text-xs font-semibold font-mono"
          style={{ color: "var(--color-text-primary)" }}
        >
          {toolName}
        </span>
        <span
          className="text-xs ml-auto px-2 py-0.5 rounded"
          style={{
            color: "var(--color-warning)",
            backgroundColor: "rgba(251, 191, 36, 0.1)",
          }}
        >
          Awaiting approval
        </span>
      </div>

      {/* Arguments summary */}
      <pre
        className="text-xs font-mono whitespace-pre-wrap break-words rounded p-3 mb-4 overflow-x-auto max-h-32 overflow-y-auto"
        style={{
          color: "var(--color-text-secondary)",
          backgroundColor: "var(--color-surface-1)",
          border: "var(--border-subtle)",
        }}
      >
        {formatArgsSummary(args)}
      </pre>

      {/* Action buttons - 44px minimum touch targets */}
      <div className="flex gap-3">
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center font-semibold text-sm rounded-lg transition-opacity hover:opacity-90 active:opacity-80"
          style={{
            minHeight: "44px",
            minWidth: "44px",
            backgroundColor: "var(--color-accent)",
            color: "var(--color-background)",
          }}
        >
          Approve
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center font-semibold text-sm rounded-lg transition-opacity hover:opacity-90 active:opacity-80"
          style={{
            minHeight: "44px",
            minWidth: "44px",
            backgroundColor: "rgba(248, 113, 113, 0.15)",
            color: "var(--color-danger)",
            border: "1px solid rgba(248, 113, 113, 0.3)",
          }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

/**
 * Connected version of ApprovalCard that reads from the AI store's
 * pendingApproval state and wires approve/reject actions.
 *
 * Returns null if there is no pending approval.
 */
export function ConnectedApprovalCard() {
  const pendingApproval = useAiStore((state) => state.pendingApproval);
  const setPendingApproval = useAiStore((state) => state.setPendingApproval);
  const setStatus = useAiStore((state) => state.setStatus);

  if (!pendingApproval) return null;

  const handleApprove = () => {
    setPendingApproval(null);
    setStatus("thinking");
  };

  const handleReject = () => {
    setPendingApproval(null);
    setStatus("idle");
  };

  return (
    <ApprovalCard
      toolName={pendingApproval.tool}
      args={pendingApproval.args}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
}

export default ApprovalCard;
