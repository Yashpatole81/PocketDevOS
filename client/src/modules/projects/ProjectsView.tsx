import { useState, useEffect, useCallback } from 'react';
import { fs as fsApi, type FsEntry } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { useNavigationStore } from '@/store/navigationStore';

/**
 * ProjectsView
 *
 * Lists directories from the workspace root, allowing the user to open a project.
 * Integrates with existing `/api/fs/readdir` endpoint.
 *
 * Requirements: 1.2, 1.5
 */
export function ProjectsView() {
  const [projects, setProjects] = useState<FsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const setActiveTab = useNavigationStore((s) => s.setActiveTab);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await fsApi.readdir('.');
      // Show only directories as projects
      const dirs = items.filter((item) => item.isDirectory);
      setProjects(dirs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleOpenProject = useCallback(
    (project: FsEntry) => {
      setWorkspace(project.path);
      setActiveTab('workspace');
    },
    [setWorkspace, setActiveTab],
  );

  // Loading state
  if (loading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ background: 'var(--color-background)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--color-accent)' }}
          />
          <p
            className="text-[11px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Loading projects...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="h-full flex items-center justify-center px-4"
        style={{ background: 'var(--color-background)' }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <p
            className="text-[11px]"
            style={{ color: 'var(--color-danger, #F87171)' }}
          >
            {error}
          </p>
          <button
            onClick={loadProjects}
            className="px-3 py-1.5 rounded text-[11px] font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text-secondary)',
              border: 'var(--border-subtle)',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-y-auto px-4 py-6"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-[18px] font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Projects
          </h1>
          <p
            className="text-[12px] mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Open a project to start working.
          </p>
        </div>

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <p
              className="text-[12px] mt-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No projects found
            </p>
            <p
              className="text-[11px] mt-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Create a directory in your workspace to get started.
            </p>
          </div>
        )}

        {/* Project list */}
        {projects.length > 0 && (
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.path}
                onClick={() => handleOpenProject(project)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left transition-colors cursor-pointer hover:bg-[var(--color-surface-2)] active:scale-[0.98] min-h-[44px]"
                style={{ border: 'var(--border-subtle)' }}
              >
                {/* Folder icon */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>

                {/* Project name */}
                <span
                  className="text-[12px] font-medium truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {project.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectsView;
