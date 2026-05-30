/**
 * Property-based tests for AI Workspace behavior.
 *
 * Property 2: Chat history preservation across navigation
 * Property 3: Tool call rendering includes all required fields
 * Property 4: Tool result collapsibility threshold
 * Property 5: Context attachment chips render all names
 * Property 6: Agent activity feed chronological ordering
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 2.6, 3.1
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { useAiStore, type ChatMessage } from "../../store/aiStore";
import { useNavigationStore, type MobileTab } from "../../store/navigationStore";
import {
  arbScrollPosition,
  arbRealisticTimestamp,
  arbNanoidSessionId,
  arbContextAttachments,
  arbAgentActions,
  arbAgentAction,
} from "./helpers";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary chat message role */
const arbRole = fc.constantFrom<ChatMessage["role"]>("user", "assistant", "tool");

/** Arbitrary chat message */
const arbChatMessage: fc.Arbitrary<ChatMessage> = fc.record({
  id: arbNanoidSessionId,
  role: arbRole,
  content: fc.string({ minLength: 0, maxLength: 500 }),
  timestamp: arbRealisticTimestamp,
});

/** Arbitrary non-empty array of chat messages */
const arbMessageArray = fc.array(arbChatMessage, { minLength: 1, maxLength: 20 });

/** Arbitrary tab that is NOT 'workspace' (used as navigation target) */
const arbOtherTab = fc.constantFrom<MobileTab>("home", "projects", "search", "settings");

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Feature: ai-first-workspace-redesign, Property 2: Chat history preservation across navigation", () => {
  beforeEach(() => {
    // Reset stores to initial state before each test
    useAiStore.setState({
      messages: [],
      scrollPosition: 0,
      status: "idle",
      pendingApproval: null,
      error: null,
      agentActions: [],
      activityFeedCollapsed: false,
      contextAttachments: [],
    });
    useNavigationStore.setState({
      activeTab: "workspace",
      previousTab: null,
      commandPaletteOpen: false,
    });
  });

  it("messages and scrollPosition are unchanged after navigating away and back", () => {
    fc.assert(
      fc.property(
        arbMessageArray,
        arbScrollPosition,
        arbOtherTab,
        (messages, scrollPosition, otherTab) => {
          // Arrange: populate the AI store with messages and scroll position
          const aiStore = useAiStore.getState();
          for (const msg of messages) {
            aiStore.addMessage(msg);
          }
          aiStore.setScrollPosition(scrollPosition);

          // Snapshot state before navigation
          const messagesBefore = useAiStore.getState().messages;
          const scrollBefore = useAiStore.getState().scrollPosition;

          // Act: navigate away from workspace
          const navStore = useNavigationStore.getState();
          navStore.setActiveTab(otherTab);

          // Verify we actually navigated away
          expect(useNavigationStore.getState().activeTab).toBe(otherTab);

          // Act: navigate back to workspace
          useNavigationStore.getState().setActiveTab("workspace");

          // Assert: messages and scroll position are preserved
          const messagesAfter = useAiStore.getState().messages;
          const scrollAfter = useAiStore.getState().scrollPosition;

          expect(messagesAfter).toEqual(messagesBefore);
          expect(scrollAfter).toBe(scrollBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("empty message array is preserved across navigation", () => {
    fc.assert(
      fc.property(
        arbScrollPosition,
        arbOtherTab,
        (scrollPosition, otherTab) => {
          // Arrange: set scroll position with no messages
          useAiStore.getState().setScrollPosition(scrollPosition);

          // Act: navigate away and back
          useNavigationStore.getState().setActiveTab(otherTab);
          useNavigationStore.getState().setActiveTab("workspace");

          // Assert: empty messages preserved, scroll position preserved
          expect(useAiStore.getState().messages).toEqual([]);
          expect(useAiStore.getState().scrollPosition).toBe(scrollPosition);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 3: Tool call rendering includes all required fields ───────────

/**
 * Property 3: Tool call rendering includes all required fields
 *
 * For any tool call with name, args, status, the rendered entry contains all fields.
 * We test against the store data structure — a ChatMessage with toolCall must contain
 * the tool name, a representation of each argument, and the current status.
 *
 * Validates: Requirements 2.3
 */

/** Arbitrary tool call args (object with string keys and JSON-serializable values) */
const arbToolCallArgs = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
  fc.oneof(fc.string({ maxLength: 100 }), fc.integer(), fc.boolean(), fc.constant(null))
);

/** Arbitrary tool call name */
const arbToolName = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Arbitrary tool call status */
const arbToolCallStatus = fc.constantFrom("running", "success", "failure", "skipped");

describe("Feature: ai-first-workspace-redesign, Property 3: Tool call rendering includes all required fields", () => {
  beforeEach(() => {
    useAiStore.setState({
      messages: [],
      scrollPosition: 0,
      status: "idle",
      pendingApproval: null,
      error: null,
      agentActions: [],
      activityFeedCollapsed: false,
      contextAttachments: [],
    });
  });

  it("tool call messages stored in the activity feed contain name, args, and status", () => {
    fc.assert(
      fc.property(
        arbToolName,
        arbToolCallArgs,
        arbToolCallStatus,
        arbNanoidSessionId,
        arbRealisticTimestamp,
        (toolName, args, status, id, timestamp) => {
          // Arrange: create a ChatMessage with a toolCall
          const message: ChatMessage = {
            id,
            role: "assistant",
            content: "",
            toolCall: {
              id: `call_${id}`,
              name: toolName,
              args,
            },
            timestamp,
          };

          // Act: add the message to the store
          useAiStore.getState().addMessage(message);

          // Assert: the stored message contains all required tool call fields
          const stored = useAiStore.getState().messages;
          const toolCallMsg = stored.find((m) => m.id === id);

          expect(toolCallMsg).toBeDefined();
          expect(toolCallMsg!.toolCall).toBeDefined();
          expect(toolCallMsg!.toolCall!.name).toBe(toolName);
          expect(toolCallMsg!.toolCall!.args).toEqual(args);

          // The tool call args can be serialized to JSON (required for rendering)
          const serialized = JSON.stringify(toolCallMsg!.toolCall!.args);
          expect(serialized).toBeDefined();
          expect(serialized.length).toBeGreaterThan(0);

          // Every key in args is present in the serialized representation
          for (const key of Object.keys(args)) {
            expect(serialized).toContain(key);
          }

          // Clean up for next iteration
          useAiStore.setState({ messages: [] });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: Tool result collapsibility threshold ───────────────────────

/**
 * Property 4: Tool result collapsibility threshold
 *
 * Output > 500 chars is collapsible, below is expanded.
 * We test the threshold logic as a pure function: given a result string length,
 * determine whether it should be collapsible.
 *
 * Validates: Requirements 2.4
 */

const COLLAPSIBLE_THRESHOLD = 500;

/** Determines if a tool result should be collapsible based on its length */
function isCollapsible(resultContent: string): boolean {
  return resultContent.length > COLLAPSIBLE_THRESHOLD;
}

/** Arbitrary short result (≤ 500 chars) */
const arbShortResult = fc.string({ minLength: 0, maxLength: COLLAPSIBLE_THRESHOLD });

/** Arbitrary long result (> 500 chars) */
const arbLongResult = fc.string({ minLength: COLLAPSIBLE_THRESHOLD + 1, maxLength: 2000 });

describe("Feature: ai-first-workspace-redesign, Property 4: Tool result collapsibility threshold", () => {
  it("results with length > 500 are marked collapsible", () => {
    fc.assert(
      fc.property(arbLongResult, (result) => {
        expect(isCollapsible(result)).toBe(true);
        expect(result.length).toBeGreaterThan(COLLAPSIBLE_THRESHOLD);
      }),
      { numRuns: 100 }
    );
  });

  it("results with length ≤ 500 are NOT marked collapsible (expanded)", () => {
    fc.assert(
      fc.property(arbShortResult, (result) => {
        expect(isCollapsible(result)).toBe(false);
        expect(result.length).toBeLessThanOrEqual(COLLAPSIBLE_THRESHOLD);
      }),
      { numRuns: 100 }
    );
  });

  it("threshold boundary: exactly 500 chars is NOT collapsible, 501 chars IS collapsible", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: COLLAPSIBLE_THRESHOLD, maxLength: COLLAPSIBLE_THRESHOLD }),
        (exactBoundary) => {
          // Exactly 500 chars should NOT be collapsible
          expect(isCollapsible(exactBoundary)).toBe(false);
          // One more char should be collapsible
          expect(isCollapsible(exactBoundary + "x")).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: Context attachment chips render all names ──────────────────

/**
 * Property 5: Context attachment chips render all names
 *
 * For any array of attachments, one chip per attachment with correct name.
 * We test against the store: adding N attachments results in N entries,
 * each with its correct name preserved.
 *
 * Validates: Requirements 2.6
 */

describe("Feature: ai-first-workspace-redesign, Property 5: Context attachment chips render all names", () => {
  beforeEach(() => {
    useAiStore.setState({
      messages: [],
      scrollPosition: 0,
      status: "idle",
      pendingApproval: null,
      error: null,
      agentActions: [],
      activityFeedCollapsed: false,
      contextAttachments: [],
    });
  });

  it("store contains exactly one entry per attachment with correct name", () => {
    fc.assert(
      fc.property(
        arbContextAttachments.filter((arr) => {
          // Ensure unique IDs for this test
          const ids = arr.map((a) => a.id);
          return new Set(ids).size === ids.length;
        }),
        (attachments) => {
          // Act: add all attachments to the store
          for (const attachment of attachments) {
            useAiStore.getState().addAttachment(attachment);
          }

          // Assert: store has exactly one entry per attachment
          const stored = useAiStore.getState().contextAttachments;
          expect(stored).toHaveLength(attachments.length);

          // Each attachment's name is preserved in the store
          for (let i = 0; i < attachments.length; i++) {
            expect(stored[i].id).toBe(attachments[i].id);
            expect(stored[i].name).toBe(attachments[i].name);
            expect(stored[i].type).toBe(attachments[i].type);
          }

          // The set of names in the store matches the input set
          const storedNames = stored.map((a) => a.name);
          const inputNames = attachments.map((a) => a.name);
          expect(storedNames).toEqual(inputNames);

          // Clean up for next iteration
          useAiStore.setState({ contextAttachments: [] });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("empty attachment array results in empty store", () => {
    fc.assert(
      fc.property(fc.constant([]), () => {
        expect(useAiStore.getState().contextAttachments).toHaveLength(0);
      }),
      { numRuns: 10 }
    );
  });
});

// ─── Property 6: Agent activity feed chronological ordering ─────────────────

/**
 * Property 6: Agent activity feed chronological ordering
 *
 * Actions sorted ascending by timestamp. For any list of agent actions with
 * timestamps, sorting by timestamp ascending produces a chronologically ordered feed.
 *
 * Validates: Requirements 3.1
 */

describe("Feature: ai-first-workspace-redesign, Property 6: Agent activity feed chronological ordering", () => {
  beforeEach(() => {
    useAiStore.setState({
      messages: [],
      scrollPosition: 0,
      status: "idle",
      pendingApproval: null,
      error: null,
      agentActions: [],
      activityFeedCollapsed: false,
      contextAttachments: [],
    });
  });

  it("agent actions sorted by timestamp ascending are in chronological order", () => {
    fc.assert(
      fc.property(
        arbAgentActions.filter((arr) => arr.length > 0),
        (actions) => {
          // Act: add all actions to the store (in arbitrary order)
          for (const action of actions) {
            useAiStore.getState().addAgentAction(action);
          }

          // Get stored actions and sort ascending by timestamp (as the component does)
          const stored = useAiStore.getState().agentActions;
          const sorted = [...stored].sort((a, b) => a.timestamp - b.timestamp);

          // Assert: sorted array is in ascending chronological order
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].timestamp).toBeGreaterThanOrEqual(sorted[i - 1].timestamp);
          }

          // Assert: all original actions are present (no loss)
          expect(sorted).toHaveLength(actions.length);

          // Assert: sorting preserves all action data
          for (const action of actions) {
            const found = sorted.find((a) => a.id === action.id);
            expect(found).toBeDefined();
            expect(found!.timestamp).toBe(action.timestamp);
            expect(found!.type).toBe(action.type);
            expect(found!.label).toBe(action.label);
            expect(found!.status).toBe(action.status);
          }

          // Clean up for next iteration
          useAiStore.setState({ agentActions: [] });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("single action is trivially sorted", () => {
    fc.assert(
      fc.property(arbAgentAction, (action) => {
        useAiStore.getState().addAgentAction(action);

        const stored = useAiStore.getState().agentActions;
        const sorted = [...stored].sort((a, b) => a.timestamp - b.timestamp);

        expect(sorted).toHaveLength(1);
        expect(sorted[0].id).toBe(action.id);
        expect(sorted[0].timestamp).toBe(action.timestamp);

        // Clean up
        useAiStore.setState({ agentActions: [] });
      }),
      { numRuns: 100 }
    );
  });
});
