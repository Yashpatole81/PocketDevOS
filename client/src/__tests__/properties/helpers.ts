/**
 * Shared test helpers and arbitraries for property-based tests.
 *
 * Provides common fast-check arbitraries used across multiple property test files
 * for the AI-first workspace redesign.
 */
import * as fc from "fast-check";

// ─── Timestamps ─────────────────────────────────────────────────────────────

/** Arbitrary positive integer timestamp (milliseconds since epoch) */
export const arbTimestamp = fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER });

/** Arbitrary timestamp within a realistic range (2020-01-01 to 2030-01-01) */
export const arbRealisticTimestamp = fc.integer({
  min: 1577836800000, // 2020-01-01T00:00:00Z
  max: 1893456000000, // 2030-01-01T00:00:00Z
});

// ─── Session IDs ────────────────────────────────────────────────────────────

/** Arbitrary non-empty session ID string */
export const arbSessionId = fc.string({ minLength: 1, maxLength: 64 }).filter(
  (s) => s.trim().length > 0
);

/** Arbitrary nanoid-style session ID (alphanumeric, 21 chars) */
export const arbNanoidSessionId = fc.stringMatching(
  /^[A-Za-z0-9_-]{21}$/
);

// ─── File Paths ─────────────────────────────────────────────────────────────

/** Known file extensions and their expected language modes */
export const FILE_EXTENSIONS = [
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".css",
  ".html",
  ".json",
  ".md",
  ".rs",
  ".go",
  ".yaml",
  ".yml",
  ".toml",
  ".sh",
  ".bash",
] as const;

/** Arbitrary file extension from the known set */
export const arbKnownExtension = fc.constantFrom(...FILE_EXTENSIONS);

/** Arbitrary unknown/unrecognized file extension */
export const arbUnknownExtension = fc.constantFrom(
  ".xyz",
  ".unknown",
  ".abc",
  ".qqq",
  ".nope"
);

/** Arbitrary file name segment (no slashes or dots) */
const arbFileNameSegment = fc.stringMatching(/^[a-zA-Z0-9_-]{1,32}$/);

/** Arbitrary file path with a known extension */
export const arbFilePathWithKnownExtension = fc
  .tuple(
    fc.array(arbFileNameSegment, { minLength: 1, maxLength: 5 }),
    arbFileNameSegment,
    arbKnownExtension
  )
  .map(([dirs, name, ext]) => dirs.join("/") + "/" + name + ext);

/** Arbitrary file path with an unknown extension */
export const arbFilePathWithUnknownExtension = fc
  .tuple(
    fc.array(arbFileNameSegment, { minLength: 1, maxLength: 5 }),
    arbFileNameSegment,
    arbUnknownExtension
  )
  .map(([dirs, name, ext]) => dirs.join("/") + "/" + name + ext);

/** Arbitrary file path (either known or unknown extension) */
export const arbFilePath = fc.oneof(
  arbFilePathWithKnownExtension,
  arbFilePathWithUnknownExtension
);

// ─── Panel Configurations ───────────────────────────────────────────────────

/** Valid panel IDs */
export const PANEL_IDS = [
  "ai",
  "terminal",
  "editor",
  "files",
  "git",
  "logs",
  "preview",
  "search",
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

/** Valid dock positions */
export const DOCK_POSITIONS = ["left", "right", "bottom", "float"] as const;

export type DockPosition = (typeof DOCK_POSITIONS)[number];

/** Arbitrary panel ID */
export const arbPanelId = fc.constantFrom(...PANEL_IDS);

/** Arbitrary dock position */
export const arbDockPosition = fc.constantFrom(...DOCK_POSITIONS);

/** Arbitrary panel configuration */
export const arbPanelConfig = fc.record({
  id: arbPanelId,
  position: arbDockPosition,
  width: fc.option(fc.integer({ min: 100, max: 2000 }), { nil: undefined }),
  height: fc.option(fc.integer({ min: 50, max: 1500 }), { nil: undefined }),
  visible: fc.boolean(),
  order: fc.integer({ min: 0, max: 20 }),
});

/** Arbitrary array of panel configurations (unique IDs) */
export const arbPanelConfigArray = fc
  .uniqueArray(arbPanelId, { minLength: 1, maxLength: PANEL_IDS.length })
  .chain((ids) =>
    fc.tuple(
      ...ids.map((id) =>
        fc.record({
          id: fc.constant(id),
          position: arbDockPosition,
          width: fc.option(fc.integer({ min: 100, max: 2000 }), {
            nil: undefined,
          }),
          height: fc.option(fc.integer({ min: 50, max: 1500 }), {
            nil: undefined,
          }),
          visible: fc.boolean(),
          order: fc.integer({ min: 0, max: 20 }),
        })
      )
    )
  );

// ─── Terminal Sessions ──────────────────────────────────────────────────────

/** Terminal session statuses */
export const SESSION_STATUSES = [
  "connected",
  "disconnected",
  "reconnecting",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** Arbitrary terminal session status */
export const arbSessionStatus = fc.constantFrom(...SESSION_STATUSES);

/** Arbitrary terminal session label (non-empty) */
export const arbSessionLabel = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/** Arbitrary terminal session */
export const arbTerminalSession = fc.record({
  id: arbNanoidSessionId,
  label: arbSessionLabel,
  pinned: fc.boolean(),
  status: arbSessionStatus,
});

/** Arbitrary array of terminal sessions */
export const arbTerminalSessions = fc.array(arbTerminalSession, {
  minLength: 0,
  maxLength: 10,
});

// ─── Agent Actions ──────────────────────────────────────────────────────────

/** Agent action types */
export const AGENT_ACTION_TYPES = [
  "file-read",
  "file-write",
  "search",
  "test-run",
  "code-gen",
  "approval-wait",
  "shell-run",
] as const;

export type AgentActionType = (typeof AGENT_ACTION_TYPES)[number];

/** Agent action statuses */
export const AGENT_ACTION_STATUSES = [
  "running",
  "success",
  "failure",
  "skipped",
] as const;

export type AgentActionStatus = (typeof AGENT_ACTION_STATUSES)[number];

/** Arbitrary agent action type */
export const arbAgentActionType = fc.constantFrom(...AGENT_ACTION_TYPES);

/** Arbitrary agent action status */
export const arbAgentActionStatus = fc.constantFrom(...AGENT_ACTION_STATUSES);

/** Arbitrary agent action */
export const arbAgentAction = fc.record({
  id: arbNanoidSessionId,
  type: arbAgentActionType,
  label: fc.string({ minLength: 1, maxLength: 100 }),
  timestamp: arbRealisticTimestamp,
  status: arbAgentActionStatus,
  detail: fc.option(fc.string({ minLength: 0, maxLength: 500 }), {
    nil: undefined,
  }),
});

/** Arbitrary array of agent actions */
export const arbAgentActions = fc.array(arbAgentAction, {
  minLength: 0,
  maxLength: 20,
});

// ─── Context Attachments ────────────────────────────────────────────────────

/** Context attachment types */
export const ATTACHMENT_TYPES = [
  "file",
  "terminal-output",
  "git-ref",
] as const;

export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

/** Arbitrary attachment type */
export const arbAttachmentType = fc.constantFrom(...ATTACHMENT_TYPES);

/** Arbitrary context attachment */
export const arbContextAttachment = fc.record({
  id: arbNanoidSessionId,
  type: arbAttachmentType,
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(
    (s) => s.trim().length > 0
  ),
  content: fc.string({ minLength: 0, maxLength: 2000 }),
});

/** Arbitrary array of context attachments */
export const arbContextAttachments = fc.array(arbContextAttachment, {
  minLength: 0,
  maxLength: 10,
});

// ─── Utility Arbitraries ────────────────────────────────────────────────────

/** Arbitrary font size (any positive number, for testing clamping) */
export const arbFontSize = fc.double({
  min: 0.1,
  max: 100,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Arbitrary scale factor for pinch-to-zoom */
export const arbScaleFactor = fc.double({
  min: 0.1,
  max: 10,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Arbitrary swipe distance in pixels */
export const arbSwipeDistance = fc.integer({ min: 0, max: 500 });

/** Arbitrary hex color string (6-digit) */
export const arbHexColor = fc
  .stringMatching(/^[0-9a-f]{6}$/)
  .map((hex) => `#${hex}`);

/** Arbitrary auth token (non-empty alphanumeric string) */
export const arbAuthToken = fc.stringMatching(/^[A-Za-z0-9._-]{10,256}$/);

/** Arbitrary base delay for exponential backoff (in ms) */
export const arbBaseDelay = fc.integer({ min: 100, max: 10000 });

/** Arbitrary scroll position */
export const arbScrollPosition = fc.integer({ min: 0, max: 100000 });

/** Arbitrary search query (non-empty) */
export const arbSearchQuery = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);
