import { create } from "zustand";
import { fs } from "../lib/api";

/**
 * A recent project displayed on the dashboard.
 */
export interface RecentProject {
  path: string;
  name: string;
  lastModified: number;
}

/**
 * A recent AI conversation displayed on the dashboard.
 */
export interface RecentConversation {
  sessionId: string;
  preview: string;
  timestamp: number;
  messageCount: number;
}

/**
 * An active AI agent task displayed on the dashboard.
 */
export interface ActiveAgentTask {
  id: string;
  description: string;
  status: "running" | "paused" | "waiting-approval";
  startedAt: number;
}

interface DashboardState {
  recentProjects: RecentProject[];
  recentConversations: RecentConversation[];
  activeAgentTasks: ActiveAgentTask[];

  loadDashboard: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  recentProjects: [],
  recentConversations: [],
  activeAgentTasks: [],

  loadDashboard: async () => {
    // Fetch recent projects from the filesystem API
    // List top-level directories in the workspace as projects
    try {
      const { items } = await fs.readdir(".");
      const directories = items.filter((item) => item.isDirectory);

      // Get stat info for each directory to determine last modified time
      const projectPromises = directories.slice(0, 10).map(async (dir) => {
        try {
          const stat = await fs.stat(dir.path);
          return {
            path: dir.path,
            name: dir.name,
            lastModified: new Date(stat.modified).getTime(),
          } as RecentProject;
        } catch {
          return {
            path: dir.path,
            name: dir.name,
            lastModified: 0,
          } as RecentProject;
        }
      });

      const projects = await Promise.all(projectPromises);
      // Sort by most recently modified and take top 3
      const recentProjects = projects
        .sort((a, b) => b.lastModified - a.lastModified)
        .slice(0, 3);

      set({ recentProjects });
    } catch {
      // If filesystem fetch fails, leave recentProjects empty
      set({ recentProjects: [] });
    }

    // Fetch recent conversations from localStorage
    // AI sessions are client-side; we read stored session metadata
    try {
      const stored = localStorage.getItem("pocketdevos-conversations");
      if (stored) {
        const conversations: RecentConversation[] = JSON.parse(stored);
        const recentConversations = conversations
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5);
        set({ recentConversations });
      }
    } catch {
      // If localStorage read fails, leave recentConversations empty
      set({ recentConversations: [] });
    }

    // Fetch active agent tasks from localStorage
    // Agent tasks are tracked client-side
    try {
      const stored = localStorage.getItem("pocketdevos-agent-tasks");
      if (stored) {
        const tasks: ActiveAgentTask[] = JSON.parse(stored);
        const activeAgentTasks = tasks.filter(
          (t) => t.status === "running" || t.status === "paused" || t.status === "waiting-approval",
        );
        set({ activeAgentTasks });
      }
    } catch {
      // If localStorage read fails, leave activeAgentTasks empty
      set({ activeAgentTasks: [] });
    }
  },
}));
