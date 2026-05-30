import { cn } from "@/lib/utils";

export interface TopBarProps {
  agentActive: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  onSettingsClick: () => void;
}

const connectionColors: Record<TopBarProps['connectionStatus'], string> = {
  connected: 'bg-[var(--success)]',
  reconnecting: 'bg-[var(--warning)]',
  disconnected: 'bg-[var(--danger)]',
};

const connectionLabels: Record<TopBarProps['connectionStatus'], string> = {
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  disconnected: 'Disconnected',
};

export function TopBar({ agentActive, connectionStatus, onSettingsClick }: TopBarProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-12 px-4 bg-[var(--color-surface-1)] border-b border-[var(--color-border)] safe-top"
    >
      {/* Left: App name + connection status */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          PocketDevOS
        </span>
        <span
          className={cn("w-2 h-2 rounded-full", connectionColors[connectionStatus])}
          title={connectionLabels[connectionStatus]}
          aria-label={`Connection status: ${connectionLabels[connectionStatus]}`}
        />
        {agentActive && (
          <span
            className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse-dot"
            title="AI agent active"
            aria-label="AI agent is active"
          />
        )}
      </div>

      {/* Right: Settings button */}
      <button
        onClick={onSettingsClick}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)] transition-colors touch-target"
        aria-label="Settings"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </header>
  );
}
