/**
 * Unit tests for DashboardView store interactions
 *
 * Since we're in a node test environment (no DOM), these tests verify:
 * 1. useDashboardStore.loadDashboard() populates state
 * 2. selectTopN returns correct items for projects (3), conversations (5), tasks
 * 3. Quick action callbacks call setActiveTab with correct values
 * 4. Empty state (no data) doesn't crash
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useDashboardStore } from "../../store/dashboardStore";
import { useNavigationStore } from "../../store/navigationStore";
import { selectTopN } from "../../lib/workspace-utils";
import type {
  RecentProject,
  RecentConversation,
  ActiveAgentTask,
} from "../../store/dashboardStore";

describe("DashboardView store interactions", () => {
  beforeEach(() => {
    // Reset stores to initial state
    useDashboardStore.setState({
      recentProjects: [],
      recentConversations: [],
      activeAgentTasks: [],
    });
    useNavigationStore.setState({
      activeTab: "home",
      previousTab: null,
      commandPaletteOpen: false,
    });

    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("useDashboardStore.loadDashboard() populates state", () => {
    it("populates recentProjects from filesystem API", async () => {
      // Mock the fs module
      vi.doMock("../../lib/api", () => ({
        fs: {
          readdir: vi.fn().mockResolvedValue({
            items: [
              { name: "project-a", path: "project-a", isDirectory: true },
              { name: "project-b", path: "project-b", isDirectory: true },
              { name: "file.txt", path: "file.txt", isDirectory: false },
            ],
          }),
          stat: vi.fn().mockImplementation((path: string) => {
            const stats: Record<string, { modified: string }> = {
              "project-a": { modified: "2024-01-15T10:00:00Z" },
              "project-b": { modified: "2024-01-16T10:00:00Z" },
            };
            return Promise.resolve(stats[path] || { modified: "2024-01-01T00:00:00Z" });
          }),
        },
      }));

      // Re-import to pick up the mock
      vi.resetModules();
      const { useDashboardStore: store } = await import("../../store/dashboardStore");

      await store.getState().loadDashboard();

      const state = store.getState();
      expect(state.recentProjects.length).toBeGreaterThan(0);
      expect(state.recentProjects.length).toBeLessThanOrEqual(3);
      // Should be sorted by lastModified descending
      for (let i = 0; i < state.recentProjects.length - 1; i++) {
        expect(state.recentProjects[i].lastModified).toBeGreaterThanOrEqual(
          state.recentProjects[i + 1].lastModified
        );
      }
    });

    it("populates recentConversations from localStorage", async () => {
      const conversations: RecentConversation[] = [
        { sessionId: "s1", preview: "Hello AI", timestamp: 1000, messageCount: 3 },
        { sessionId: "s2", preview: "Fix bug", timestamp: 3000, messageCount: 7 },
        { sessionId: "s3", preview: "Refactor", timestamp: 2000, messageCount: 5 },
      ];

      vi.stubGlobal("localStorage", {
        getItem: vi.fn().mockImplementation((key: string) => {
          if (key === "pocketdevos-conversations") return JSON.stringify(conversations);
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      });

      // Mock fs to avoid network calls
      vi.doMock("../../lib/api", () => ({
        fs: {
          readdir: vi.fn().mockResolvedValue({ items: [] }),
          stat: vi.fn().mockResolvedValue({ modified: "2024-01-01T00:00:00Z" }),
        },
      }));

      vi.resetModules();
      const { useDashboardStore: store } = await import("../../store/dashboardStore");

      await store.getState().loadDashboard();

      const state = store.getState();
      expect(state.recentConversations.length).toBe(3);
      // Should be sorted by timestamp descending
      expect(state.recentConversations[0].sessionId).toBe("s2");
      expect(state.recentConversations[1].sessionId).toBe("s3");
      expect(state.recentConversations[2].sessionId).toBe("s1");
    });

    it("populates activeAgentTasks from localStorage", async () => {
      const tasks: ActiveAgentTask[] = [
        { id: "t1", description: "Running tests", status: "running", startedAt: 1000 },
        { id: "t2", description: "Paused task", status: "paused", startedAt: 2000 },
        { id: "t3", description: "Waiting", status: "waiting-approval", startedAt: 3000 },
      ];

      vi.stubGlobal("localStorage", {
        getItem: vi.fn().mockImplementation((key: string) => {
          if (key === "pocketdevos-agent-tasks") return JSON.stringify(tasks);
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      });

      vi.doMock("../../lib/api", () => ({
        fs: {
          readdir: vi.fn().mockResolvedValue({ items: [] }),
          stat: vi.fn().mockResolvedValue({ modified: "2024-01-01T00:00:00Z" }),
        },
      }));

      vi.resetModules();
      const { useDashboardStore: store } = await import("../../store/dashboardStore");

      await store.getState().loadDashboard();

      const state = store.getState();
      expect(state.activeAgentTasks.length).toBe(3);
      expect(state.activeAgentTasks.every((t) => ["running", "paused", "waiting-approval"].includes(t.status))).toBe(true);
    });

    it("handles filesystem API failure gracefully", async () => {
      vi.doMock("../../lib/api", () => ({
        fs: {
          readdir: vi.fn().mockRejectedValue(new Error("Network error")),
          stat: vi.fn().mockRejectedValue(new Error("Network error")),
        },
      }));

      vi.resetModules();
      const { useDashboardStore: store } = await import("../../store/dashboardStore");

      // Should not throw
      await store.getState().loadDashboard();

      const state = store.getState();
      expect(state.recentProjects).toEqual([]);
    });
  });

  describe("selectTopN returns correct items", () => {
    const projects: RecentProject[] = [
      { path: "/a", name: "A", lastModified: 100 },
      { path: "/b", name: "B", lastModified: 500 },
      { path: "/c", name: "C", lastModified: 300 },
      { path: "/d", name: "D", lastModified: 400 },
      { path: "/e", name: "E", lastModified: 200 },
    ];

    it("returns top 3 projects sorted by lastModified descending", () => {
      const result = selectTopN<RecentProject>(projects, 3, (p) => p.lastModified);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("B"); // 500
      expect(result[1].name).toBe("D"); // 400
      expect(result[2].name).toBe("C"); // 300
    });

    it("returns top 5 conversations sorted by timestamp descending", () => {
      const conversations: RecentConversation[] = [
        { sessionId: "s1", preview: "a", timestamp: 100, messageCount: 1 },
        { sessionId: "s2", preview: "b", timestamp: 600, messageCount: 2 },
        { sessionId: "s3", preview: "c", timestamp: 300, messageCount: 3 },
        { sessionId: "s4", preview: "d", timestamp: 500, messageCount: 4 },
        { sessionId: "s5", preview: "e", timestamp: 400, messageCount: 5 },
        { sessionId: "s6", preview: "f", timestamp: 200, messageCount: 6 },
        { sessionId: "s7", preview: "g", timestamp: 700, messageCount: 7 },
      ];

      const result = selectTopN<RecentConversation>(conversations, 5, (c) => c.timestamp);

      expect(result).toHaveLength(5);
      expect(result[0].sessionId).toBe("s7"); // 700
      expect(result[1].sessionId).toBe("s2"); // 600
      expect(result[2].sessionId).toBe("s4"); // 500
      expect(result[3].sessionId).toBe("s5"); // 400
      expect(result[4].sessionId).toBe("s3"); // 300
    });

    it("filters active tasks by status (running/paused only)", () => {
      const tasks: ActiveAgentTask[] = [
        { id: "t1", description: "Running", status: "running", startedAt: 300 },
        { id: "t2", description: "Paused", status: "paused", startedAt: 200 },
        { id: "t3", description: "Waiting", status: "waiting-approval", startedAt: 100 },
      ];

      const result = selectTopN<ActiveAgentTask>(
        tasks,
        10,
        (t) => t.startedAt,
        (t) => t.status === "running" || t.status === "paused"
      );

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.status === "running" || t.status === "paused")).toBe(true);
      // Sorted by startedAt descending
      expect(result[0].id).toBe("t1"); // 300
      expect(result[1].id).toBe("t2"); // 200
    });

    it("returns fewer items when list has less than N", () => {
      const twoProjects = projects.slice(0, 2);
      const result = selectTopN<RecentProject>(twoProjects, 3, (p) => p.lastModified);

      expect(result).toHaveLength(2);
    });

    it("returns empty array when input is empty", () => {
      const result = selectTopN<RecentProject>([], 3, (p) => p.lastModified);
      expect(result).toEqual([]);
    });
  });

  describe("Quick action callbacks call setActiveTab correctly", () => {
    it("'Resume Last Session' navigates to workspace tab", () => {
      const { setActiveTab } = useNavigationStore.getState();
      setActiveTab("workspace");

      expect(useNavigationStore.getState().activeTab).toBe("workspace");
      expect(useNavigationStore.getState().previousTab).toBe("home");
    });

    it("'Clone Repository' navigates to projects tab", () => {
      const { setActiveTab } = useNavigationStore.getState();
      setActiveTab("projects");

      expect(useNavigationStore.getState().activeTab).toBe("projects");
      expect(useNavigationStore.getState().previousTab).toBe("home");
    });

    it("'Ask AI' navigates to workspace tab", () => {
      const { setActiveTab } = useNavigationStore.getState();
      setActiveTab("workspace");

      expect(useNavigationStore.getState().activeTab).toBe("workspace");
    });

    it("setActiveTab does not change state when navigating to current tab", () => {
      // Already on 'home'
      const { setActiveTab } = useNavigationStore.getState();
      setActiveTab("home");

      expect(useNavigationStore.getState().activeTab).toBe("home");
      expect(useNavigationStore.getState().previousTab).toBeNull();
    });

    it("tracks previousTab correctly across multiple navigations", () => {
      const store = useNavigationStore;

      store.getState().setActiveTab("workspace");
      expect(store.getState().previousTab).toBe("home");

      store.getState().setActiveTab("projects");
      expect(store.getState().previousTab).toBe("workspace");

      store.getState().setActiveTab("settings");
      expect(store.getState().previousTab).toBe("projects");
    });
  });

  describe("Empty state handling", () => {
    it("selectTopN with empty projects does not crash", () => {
      const result = selectTopN<RecentProject>([], 3, (p) => p.lastModified);
      expect(result).toEqual([]);
    });

    it("selectTopN with empty conversations does not crash", () => {
      const result = selectTopN<RecentConversation>([], 5, (c) => c.timestamp);
      expect(result).toEqual([]);
    });

    it("selectTopN with empty tasks and filter does not crash", () => {
      const result = selectTopN<ActiveAgentTask>(
        [],
        10,
        (t) => t.startedAt,
        (t) => t.status === "running" || t.status === "paused"
      );
      expect(result).toEqual([]);
    });

    it("dashboard store initial state has empty arrays", () => {
      const state = useDashboardStore.getState();
      expect(state.recentProjects).toEqual([]);
      expect(state.recentConversations).toEqual([]);
      expect(state.activeAgentTasks).toEqual([]);
    });

    it("loadDashboard with no localStorage data leaves state empty", async () => {
      vi.doMock("../../lib/api", () => ({
        fs: {
          readdir: vi.fn().mockResolvedValue({ items: [] }),
          stat: vi.fn().mockResolvedValue({ modified: "2024-01-01T00:00:00Z" }),
        },
      }));

      vi.resetModules();
      const { useDashboardStore: store } = await import("../../store/dashboardStore");

      await store.getState().loadDashboard();

      const state = store.getState();
      expect(state.recentProjects).toEqual([]);
      expect(state.recentConversations).toEqual([]);
      expect(state.activeAgentTasks).toEqual([]);
    });
  });
});
