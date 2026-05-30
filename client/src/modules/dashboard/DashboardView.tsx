import { useEffect } from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useNavigationStore } from '../../store/navigationStore';
import { selectTopN } from '../../lib/workspace-utils';
import type { RecentProject, RecentConversation, ActiveAgentTask } from '../../store/dashboardStore';

/**
 * Formats a timestamp into a human-readable relative time string.
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Status badge for active agent tasks.
 */
function StatusBadge({ status }: { status: ActiveAgentTask['status'] }) {
  const config: Record<ActiveAgentTask['status'], { label: string; color: string }> = {
    running: { label: 'Running', color: 'var(--color-success)' },
    paused: { label: 'Paused', color: 'var(--color-warning)' },
    'waiting-approval': { label: 'Waiting', color: 'var(--color-accent)' },
  };

  const { label, color } = config[status];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      {status === 'running' && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </span>
  );
}

/**
 * Section header component for dashboard sections.
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      className="text-[11px] font-semibold uppercase tracking-widest mb-3"
      style={{ color: 'var(--color-text-muted)' }}
    >
      {title}
    </h2>
  );
}

/**
 * Continue Working section — shows 3 most recent projects.
 */
function ContinueWorkingSection({ projects }: { projects: RecentProject[] }) {
  if (projects.length === 0) {
    return (
      <section className="mb-6">
        <SectionHeader title="Continue Working" />
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          No recent projects
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <SectionHeader title="Continue Working" />
      <div className="space-y-2">
        {projects.map((project) => (
          <div
            key={project.path}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--color-surface-2)]"
            style={{ border: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span
                className="text-[12px] font-medium truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {project.name}
              </span>
            </div>
            <span
              className="text-[10px] flex-shrink-0 ml-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {formatRelativeTime(project.lastModified)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Recent AI Conversations section — shows 5 most recent sessions.
 */
function RecentConversationsSection({ conversations }: { conversations: RecentConversation[] }) {
  if (conversations.length === 0) {
    return (
      <section className="mb-6">
        <SectionHeader title="Recent AI Conversations" />
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          No recent conversations
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <SectionHeader title="Recent AI Conversations" />
      <div className="space-y-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.sessionId}
            className="px-3 py-2.5 rounded-lg transition-colors cursor-pointer hover:bg-[var(--color-surface-2)]"
            style={{ border: 'var(--border-subtle)' }}
          >
            <p
              className="text-[11px] truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {conversation.preview}
            </p>
            <p
              className="text-[10px] mt-0.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {conversation.messageCount} messages · {formatRelativeTime(conversation.timestamp)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Active Agent Tasks section — shows running/paused tasks with status badges.
 */
function ActiveAgentTasksSection({ tasks }: { tasks: ActiveAgentTask[] }) {
  if (tasks.length === 0) {
    return (
      <section className="mb-6">
        <SectionHeader title="Active Agent Tasks" />
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          No active tasks
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <SectionHeader title="Active Agent Tasks" />
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg"
            style={{ border: 'var(--border-subtle)' }}
          >
            <span
              className="text-[11px] truncate mr-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {task.description}
            </span>
            <StatusBadge status={task.status} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Quick Actions section — shortcut buttons for common operations.
 */
function QuickActionsSection() {
  const setActiveTab = useNavigationStore((s) => s.setActiveTab);

  const actions = [
    {
      label: 'Resume Last Session',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
      onClick: () => setActiveTab('workspace'),
    },
    {
      label: 'Clone Repository',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      ),
      onClick: () => setActiveTab('projects'),
    },
    {
      label: 'Ask AI',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      onClick: () => setActiveTab('workspace'),
    },
  ];

  return (
    <section className="mb-6">
      <SectionHeader title="Quick Actions" />
      <div className="grid grid-cols-3 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex flex-col items-center justify-center gap-2 px-2 py-4 rounded-lg transition-all min-h-[44px] hover:bg-[var(--color-surface-2)] active:scale-95"
            style={{
              border: 'var(--border-subtle)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span style={{ color: 'var(--color-accent)' }}>{action.icon}</span>
            <span className="text-[10px] font-medium text-center leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * DashboardView
 *
 * The home screen displayed on app launch. Shows recent projects,
 * AI conversations, active agent tasks, and quick actions.
 *
 * Uses `useDashboardStore` for data, `useNavigationStore` for navigation,
 * and `selectTopN` from workspace-utils for data selection.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
export function DashboardView() {
  const {
    recentProjects,
    recentConversations,
    activeAgentTasks,
    loadDashboard,
  } = useDashboardStore();

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Use selectTopN to get the correct number of items sorted by timestamp
  const topProjects = selectTopN<RecentProject>(
    recentProjects,
    3,
    (p) => p.lastModified
  );

  const topConversations = selectTopN<RecentConversation>(
    recentConversations,
    5,
    (c) => c.timestamp
  );

  // Filter active tasks to only running/paused
  const activeTasks = selectTopN<ActiveAgentTask>(
    activeAgentTasks,
    10,
    (t) => t.startedAt,
    (t) => t.status === 'running' || t.status === 'paused'
  );

  return (
    <div
      className="h-full overflow-y-auto px-4 py-6"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-[18px] font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Dashboard
          </h1>
          <p
            className="text-[12px] mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Welcome back. Pick up where you left off.
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActionsSection />

        {/* Continue Working */}
        <ContinueWorkingSection projects={topProjects} />

        {/* Recent AI Conversations */}
        <RecentConversationsSection conversations={topConversations} />

        {/* Active Agent Tasks */}
        <ActiveAgentTasksSection tasks={activeTasks} />
      </div>
    </div>
  );
}

export default DashboardView;
