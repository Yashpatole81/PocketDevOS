/**
 * Command Registry for the Command Palette.
 *
 * Provides a singleton registry where commands can be registered and searched.
 * Search uses fuzzy matching against command labels and keywords,
 * groups results by category, and caps at 8 results per category.
 */
import type { ReactNode } from "react";
import { fuzzyMatch } from "./workspace-utils";
import { useNavigationStore, type MobileTab } from "../store/navigationStore";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CommandCategory = "files" | "commands" | "recent" | "ai-actions";

export interface CommandDefinition {
  id: string;
  label: string;
  category: CommandCategory;
  keywords: string[];
  action: () => void;
  icon?: ReactNode;
}

export interface SearchResult {
  id: string;
  category: CommandCategory;
  label: string;
  description?: string;
  icon?: ReactNode;
  action: () => void;
}

export type GroupedSearchResults = Record<CommandCategory, SearchResult[]>;

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_RESULTS_PER_CATEGORY = 8;

const CATEGORIES: CommandCategory[] = ["files", "commands", "recent", "ai-actions"];

// ─── CommandRegistry Class ──────────────────────────────────────────────────

export class CommandRegistry {
  commands: CommandDefinition[] = [];

  /**
   * Register a command in the registry.
   */
  register(command: CommandDefinition): void {
    this.commands.push(command);
  }

  /**
   * Search the registry with a query string.
   * Uses fuzzy matching against label and keywords.
   * Returns results grouped by category, capped at 8 per category.
   */
  search(query: string): GroupedSearchResults {
    const results: GroupedSearchResults = {
      files: [],
      commands: [],
      recent: [],
      "ai-actions": [],
    };

    if (!query || query.trim().length === 0) {
      return results;
    }

    for (const cmd of this.commands) {
      const matchesLabel = fuzzyMatch(query, cmd.label);
      const matchesKeyword = cmd.keywords.some((kw) => fuzzyMatch(query, kw));

      if (matchesLabel || matchesKeyword) {
        const group = results[cmd.category];
        if (group.length < MAX_RESULTS_PER_CATEGORY) {
          group.push({
            id: cmd.id,
            category: cmd.category,
            label: cmd.label,
            icon: cmd.icon,
            action: cmd.action,
          });
        }
      }
    }

    return results;
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

export const commandRegistry = new CommandRegistry();

// ─── Default Commands ───────────────────────────────────────────────────────

function registerDefaultCommands(): void {
  const navigate = (tab: MobileTab) => {
    useNavigationStore.getState().setActiveTab(tab);
  };

  // Navigation commands
  commandRegistry.register({
    id: "nav-home",
    label: "Navigate to Home",
    category: "commands",
    keywords: ["home", "dashboard", "go home"],
    action: () => navigate("home"),
  });

  commandRegistry.register({
    id: "nav-workspace",
    label: "Navigate to Workspace",
    category: "commands",
    keywords: ["workspace", "ai", "chat", "assistant"],
    action: () => navigate("workspace"),
  });

  commandRegistry.register({
    id: "nav-projects",
    label: "Navigate to Projects",
    category: "commands",
    keywords: ["projects", "files", "explorer", "browse"],
    action: () => navigate("projects"),
  });

  commandRegistry.register({
    id: "nav-settings",
    label: "Navigate to Settings",
    category: "commands",
    keywords: ["settings", "preferences", "config", "options"],
    action: () => navigate("settings"),
  });

  // Command palette
  commandRegistry.register({
    id: "open-command-palette",
    label: "Open Command Palette",
    category: "commands",
    keywords: ["palette", "search", "find", "ctrl+k"],
    action: () => useNavigationStore.getState().openCommandPalette(),
  });

  // AI actions
  commandRegistry.register({
    id: "clear-chat",
    label: "Clear Chat",
    category: "ai-actions",
    keywords: ["clear", "reset", "new conversation", "fresh"],
    action: () => {
      // Placeholder — will be wired to AI store's clear action
    },
  });

  commandRegistry.register({
    id: "new-terminal",
    label: "New Terminal",
    category: "commands",
    keywords: ["terminal", "shell", "console", "new session"],
    action: () => {
      // Placeholder — will be wired to terminal store's addSession action
    },
  });
}

registerDefaultCommands();
