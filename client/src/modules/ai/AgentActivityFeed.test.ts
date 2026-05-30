/**
 * Unit tests for AgentActivityFeed component logic.
 *
 * Tests the store interactions and data flow that the AgentActivityFeed
 * component relies on: chronological ordering, status updates, and collapse toggle.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAiStore, type AgentAction } from '../../store/aiStore';

describe('AgentActivityFeed', () => {
  beforeEach(() => {
    useAiStore.setState({
      agentActions: [],
      activityFeedCollapsed: false,
    });
  });

  describe('Chronological ordering (Requirement 3.1)', () => {
    it('actions are stored and can be sorted by timestamp ascending', () => {
      const actions: AgentAction[] = [
        { id: '3', type: 'code-gen', label: 'Generate code', timestamp: 3000, status: 'success' },
        { id: '1', type: 'file-read', label: 'Read file', timestamp: 1000, status: 'success' },
        { id: '2', type: 'search', label: 'Search files', timestamp: 2000, status: 'running' },
      ];

      for (const action of actions) {
        useAiStore.getState().addAgentAction(action);
      }

      const stored = useAiStore.getState().agentActions;
      const sorted = [...stored].sort((a, b) => a.timestamp - b.timestamp);

      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });

    it('displays all action types', () => {
      const types: AgentAction['type'][] = [
        'file-read', 'file-write', 'search', 'test-run', 'code-gen', 'approval-wait', 'shell-run',
      ];

      for (let i = 0; i < types.length; i++) {
        useAiStore.getState().addAgentAction({
          id: `action-${i}`,
          type: types[i],
          label: `Action ${types[i]}`,
          timestamp: Date.now() + i,
          status: 'success',
        });
      }

      const stored = useAiStore.getState().agentActions;
      expect(stored).toHaveLength(7);
      expect(stored.map((a) => a.type)).toEqual(types);
    });
  });

  describe('Appending new actions (Requirement 3.2)', () => {
    it('appends new actions to the list', () => {
      useAiStore.getState().addAgentAction({
        id: 'first',
        type: 'file-read',
        label: 'Reading config.ts',
        timestamp: 1000,
        status: 'running',
      });

      expect(useAiStore.getState().agentActions).toHaveLength(1);

      useAiStore.getState().addAgentAction({
        id: 'second',
        type: 'search',
        label: 'Searching for imports',
        timestamp: 2000,
        status: 'running',
      });

      expect(useAiStore.getState().agentActions).toHaveLength(2);
    });

    it('new actions have timestamp and status', () => {
      const now = Date.now();
      useAiStore.getState().addAgentAction({
        id: 'timed',
        type: 'test-run',
        label: 'Running tests',
        timestamp: now,
        status: 'running',
      });

      const action = useAiStore.getState().agentActions[0];
      expect(action.timestamp).toBe(now);
      expect(action.status).toBe('running');
    });
  });

  describe('Updating action status (Requirement 3.3)', () => {
    it('updates action status to success', () => {
      useAiStore.getState().addAgentAction({
        id: 'update-me',
        type: 'test-run',
        label: 'Running tests',
        timestamp: 1000,
        status: 'running',
      });

      useAiStore.getState().updateAgentAction('update-me', { status: 'success' });

      const action = useAiStore.getState().agentActions[0];
      expect(action.status).toBe('success');
    });

    it('updates action status to failure', () => {
      useAiStore.getState().addAgentAction({
        id: 'fail-me',
        type: 'code-gen',
        label: 'Generating code',
        timestamp: 1000,
        status: 'running',
      });

      useAiStore.getState().updateAgentAction('fail-me', { status: 'failure' });

      const action = useAiStore.getState().agentActions[0];
      expect(action.status).toBe('failure');
    });

    it('updates action status to skipped', () => {
      useAiStore.getState().addAgentAction({
        id: 'skip-me',
        type: 'shell-run',
        label: 'Running shell command',
        timestamp: 1000,
        status: 'running',
      });

      useAiStore.getState().updateAgentAction('skip-me', { status: 'skipped' });

      const action = useAiStore.getState().agentActions[0];
      expect(action.status).toBe('skipped');
    });

    it('only updates the targeted action', () => {
      useAiStore.getState().addAgentAction({
        id: 'keep',
        type: 'file-read',
        label: 'Keep this',
        timestamp: 1000,
        status: 'running',
      });
      useAiStore.getState().addAgentAction({
        id: 'change',
        type: 'search',
        label: 'Change this',
        timestamp: 2000,
        status: 'running',
      });

      useAiStore.getState().updateAgentAction('change', { status: 'success' });

      const actions = useAiStore.getState().agentActions;
      expect(actions[0].status).toBe('running');
      expect(actions[1].status).toBe('success');
    });
  });

  describe('Collapsible panel toggle (Requirement 3.4)', () => {
    it('starts expanded (not collapsed)', () => {
      expect(useAiStore.getState().activityFeedCollapsed).toBe(false);
    });

    it('toggles to collapsed', () => {
      useAiStore.getState().toggleActivityFeed();
      expect(useAiStore.getState().activityFeedCollapsed).toBe(true);
    });

    it('toggles back to expanded', () => {
      useAiStore.getState().toggleActivityFeed();
      useAiStore.getState().toggleActivityFeed();
      expect(useAiStore.getState().activityFeedCollapsed).toBe(false);
    });
  });
});
