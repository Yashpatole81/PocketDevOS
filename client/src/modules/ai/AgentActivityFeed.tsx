/**
 * AgentActivityFeed - Live feed of AI agent actions.
 *
 * Displays a chronological list of agent actions (file reads, searches, test runs,
 * code generation, approval waits) sorted by timestamp ascending. Shows status icons
 * (spinner for running, checkmark for success, X for failure). Uses monochrome theme.
 * Implements a collapsible panel toggle.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
import { useAiStore, type AgentAction } from '../../store/aiStore';

// ─── Status Icons ───────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8.5L6.5 12L13 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 4L12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{
        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        transition: 'transform 200ms ease',
      }}
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Action Type Icons ──────────────────────────────────────────────────────

function ActionTypeIcon({ type }: { type: AgentAction['type'] }) {
  const iconMap: Record<AgentAction['type'], string> = {
    'file-read': '📄',
    'file-write': '✏️',
    'search': '🔍',
    'test-run': '🧪',
    'code-gen': '⚡',
    'approval-wait': '⏳',
    'shell-run': '💻',
  };

  return <span className="text-xs" aria-hidden="true">{iconMap[type]}</span>;
}

// ─── Status Indicator ───────────────────────────────────────────────────────

function StatusIndicator({ status }: { status: AgentAction['status'] }) {
  switch (status) {
    case 'running':
      return (
        <span style={{ color: 'var(--color-accent)' }} aria-label="Running">
          <SpinnerIcon />
        </span>
      );
    case 'success':
      return (
        <span style={{ color: 'var(--color-success)' }} aria-label="Success">
          <CheckIcon />
        </span>
      );
    case 'failure':
      return (
        <span style={{ color: 'var(--color-danger)' }} aria-label="Failed">
          <XIcon />
        </span>
      );
    case 'skipped':
      return (
        <span style={{ color: 'var(--color-text-muted)' }} aria-label="Skipped">
          <SkipIcon />
        </span>
      );
  }
}

// ─── Timestamp Formatter ────────────────────────────────────────────────────

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Action Entry ───────────────────────────────────────────────────────────

function ActionEntry({ action }: { action: AgentAction }) {
  return (
    <div
      className="flex items-center gap-2 py-1 px-2"
      style={{
        borderBottom: 'var(--border-subtle)',
        animation: 'fadeIn 100ms ease-out',
      }}
      data-testid={`agent-action-${action.id}`}
      data-status={action.status}
    >
      <StatusIndicator status={action.status} />
      <ActionTypeIcon type={action.type} />
      <span
        className="flex-1 text-xs truncate"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {action.label}
      </span>
      <span
        className="text-xs whitespace-nowrap"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {formatTimestamp(action.timestamp)}
      </span>
    </div>
  );
}

// ─── AgentActivityFeed Component ────────────────────────────────────────────

export function AgentActivityFeed() {
  const agentActions = useAiStore((state) => state.agentActions);
  const activityFeedCollapsed = useAiStore((state) => state.activityFeedCollapsed);
  const toggleActivityFeed = useAiStore((state) => state.toggleActivityFeed);

  // Sort actions by timestamp ascending (oldest first, newest last)
  const sortedActions = [...agentActions].sort((a, b) => a.timestamp - b.timestamp);

  const runningCount = agentActions.filter((a) => a.status === 'running').length;

  return (
    <div
      className="flex flex-col"
      style={{
        background: 'var(--color-surface-1)',
        borderTop: 'var(--border-default)',
      }}
      role="region"
      aria-label="Agent Activity Feed"
    >
      {/* Header with collapse toggle */}
      <button
        onClick={toggleActivityFeed}
        className="flex items-center justify-between w-full px-3 py-2 text-left"
        style={{
          background: 'var(--color-surface-2)',
          borderBottom: activityFeedCollapsed ? 'none' : 'var(--border-subtle)',
          minHeight: '36px',
        }}
        aria-expanded={!activityFeedCollapsed}
        aria-controls="agent-activity-list"
      >
        <div className="flex items-center gap-2">
          <ChevronIcon collapsed={activityFeedCollapsed} />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Agent Activity
          </span>
          {runningCount > 0 && (
            <span
              className="inline-flex items-center justify-center text-xs rounded-full px-1.5"
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-background)',
                minWidth: '18px',
                height: '18px',
                fontSize: '10px',
                fontWeight: 600,
              }}
            >
              {runningCount}
            </span>
          )}
        </div>
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {sortedActions.length} {sortedActions.length === 1 ? 'action' : 'actions'}
        </span>
      </button>

      {/* Action list */}
      {!activityFeedCollapsed && (
        <div
          id="agent-activity-list"
          className="overflow-y-auto"
          style={{ maxHeight: '200px' }}
        >
          {sortedActions.length === 0 ? (
            <div
              className="flex items-center justify-center py-4"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <span className="text-xs">No agent activity yet</span>
            </div>
          ) : (
            sortedActions.map((action) => (
              <ActionEntry key={action.id} action={action} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default AgentActivityFeed;
