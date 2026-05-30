import React, { Suspense } from 'react';
import { useNavigationStore, type MobileTab } from '../store/navigationStore';
import { DashboardView } from '../modules/dashboard/DashboardView';
import { ProjectsView } from '../modules/projects/ProjectsView';

/**
 * Lazy-loaded heavy modules.
 * These are loaded on first access via React.lazy + dynamic import.
 * The .then() handler normalizes both default and named exports.
 */
const LazyAIWorkspaceView = React.lazy(() =>
  import('../modules/ai/AIWorkspaceView').then((m) => ({
    default: m.default ?? m.AIWorkspaceView,
  }))
);

// Editor and Terminal are lazy-loaded but require props, so they are
// exported for use by parent components (e.g., PanelSystem) that provide props.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LazyEditorPanel = React.lazy(() =>
  import('../modules/editor/EditorPane').then((m) => ({
    default: m.EditorPane as React.ComponentType<any>,
  }))
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LazyTerminalPanel = React.lazy(() =>
  import('../modules/terminal/TerminalPane').then((m) => ({
    default: m.TerminalPane as React.ComponentType<any>,
  }))
);

/** Loading fallback shown while lazy modules are being fetched */
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{
            borderColor: 'var(--color-text-muted)',
            borderTopColor: 'var(--color-accent)',
          }}
        />
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Loading...
        </span>
      </div>
    </div>
  );
}

/** Placeholder view for views not yet implemented */
function PlaceholderView({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="text-center">
        <h2
          className="text-lg font-medium mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {name}
        </h2>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-sm">
          Coming soon
        </p>
      </div>
    </div>
  );
}

/** Renders the view corresponding to the given tab */
function ViewForTab({ tab }: { tab: MobileTab }) {
  switch (tab) {
    case 'home':
      return <DashboardView />;
    case 'workspace':
      return (
        <Suspense fallback={<LoadingFallback />}>
          <LazyAIWorkspaceView />
        </Suspense>
      );
    case 'projects':
      return <ProjectsView />;
    case 'search':
      return <PlaceholderView name="Command Palette" />;
    case 'settings':
      return <PlaceholderView name="Settings" />;
    default:
      return <PlaceholderView name="Dashboard" />;
  }
}

/**
 * ContentRouter
 *
 * Routes between views based on the active tab from navigationStore.
 * Applies a crossfade transition (200ms) when switching views.
 * Heavy modules (AI Workspace, Editor, Terminal) are lazy-loaded on first access.
 *
 * The `key` prop on the wrapper div forces React to remount the view on tab change,
 * triggering the crossfade animation defined in globals.css.
 *
 * Requirements: 4.3, 13.2
 */
export function ContentRouter() {
  const activeTab = useNavigationStore((s) => s.activeTab);

  return (
    <div
      key={activeTab}
      className="animate-crossfade h-full w-full overflow-hidden"
      style={{ background: 'var(--color-background)' }}
    >
      <ViewForTab tab={activeTab} />
    </div>
  );
}

export { LazyAIWorkspaceView, LazyEditorPanel, LazyTerminalPanel, LoadingFallback };
export default ContentRouter;
