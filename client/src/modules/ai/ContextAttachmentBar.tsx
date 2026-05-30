import { useAiStore, type ContextAttachment } from "@/store/aiStore";

/**
 * Icon component for attachment type.
 */
function AttachmentIcon({ type }: { type: ContextAttachment["type"] }) {
  switch (type) {
    case "file":
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
      );
    case "terminal-output":
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" x2="20" y1="19" y2="19" />
        </svg>
      );
    case "git-ref":
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
          <path d="M12 12v3" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * A single attachment chip with icon, name, and remove button.
 */
function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: ContextAttachment;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0"
      style={{
        backgroundColor: "var(--color-surface-3)",
        border: "var(--border-subtle)",
      }}
    >
      <span style={{ color: "var(--color-text-muted)" }}>
        <AttachmentIcon type={attachment.type} />
      </span>
      <span
        className="text-[11px] font-medium max-w-[120px] truncate"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {attachment.name}
      </span>
      <button
        onClick={() => onRemove(attachment.id)}
        className="flex items-center justify-center w-4 h-4 rounded-sm hover:opacity-80 transition-opacity"
        style={{ color: "var(--color-text-muted)" }}
        aria-label={`Remove ${attachment.name}`}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * ContextAttachmentBar - Displays context attachment chips in a horizontal scrollable row.
 *
 * Renders one chip per attachment (file, terminal output, git ref). Each chip shows
 * an icon based on type, the attachment name, and an X button to remove it.
 * Uses the monochrome theme with surface-3 background for chips.
 */
export function ContextAttachmentBar() {
  const contextAttachments = useAiStore((state) => state.contextAttachments);
  const removeAttachment = useAiStore((state) => state.removeAttachment);

  if (contextAttachments.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 overflow-x-auto"
      style={{ borderBottom: "var(--border-subtle)" }}
    >
      {contextAttachments.map((attachment) => (
        <AttachmentChip
          key={attachment.id}
          attachment={attachment}
          onRemove={removeAttachment}
        />
      ))}
    </div>
  );
}

export default ContextAttachmentBar;
