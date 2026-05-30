/**
 * AIWorkspaceView - Enhanced AI Workspace with activity feed, agent actions,
 * context attachments, and message input.
 *
 * Composes:
 * - ActivityFeed: Linear-style message list with tool calls, results, status updates
 * - AgentActivityFeed: Collapsible panel showing real-time agent actions
 * - ContextAttachmentBar: Chips showing attached files/terminal output/git refs
 * - MessageInput: Text input with send button
 *
 * Preserves chat history and scroll position across navigation via useAiStore.
 * Handles file reference taps by opening the file in the editor panel.
 *
 * Requirements: 2.1, 2.2, 2.6, 2.8
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAiStore } from '@/store/aiStore';
import { useAppStore } from '@/store/appStore';
import { useNavigationStore } from '@/store/navigationStore';
import { fs as fsApi } from '@/lib/api';
import { ActivityFeed } from './ActivityFeed';
import { AgentActivityFeed } from './AgentActivityFeed';
import { ContextAttachmentBar } from './ContextAttachmentBar';
import { useAiChat } from './useAiChat';

// ─── MessageInput Component ─────────────────────────────────────────────────

/**
 * Text input with send button for composing messages.
 * Supports Enter to send (Shift+Enter for newline).
 */
function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <div
      className="flex items-end gap-2 px-3 py-3"
      style={{
        borderTop: 'var(--border-default)',
        background: 'var(--color-surface-1)',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none placeholder:text-[var(--color-text-muted)]"
        style={{
          background: 'var(--color-surface-2)',
          border: 'var(--border-subtle)',
          color: 'var(--color-text-primary)',
          minHeight: '40px',
          maxHeight: '120px',
          fontFamily: 'var(--font-sans)',
        }}
        aria-label="Message input"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-40"
        style={{
          minWidth: '44px',
          minHeight: '44px',
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-background)',
        }}
        aria-label="Send message"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      </button>
    </div>
  );
}

// ─── File Reference Handler ─────────────────────────────────────────────────

/**
 * Opens a file in the editor panel when a file reference is tapped.
 * Reads the file content from the API and navigates to the editor.
 */
async function openFileInEditor(
  filePath: string,
  openFile: typeof useAppStore.getState extends () => infer S
    ? S extends { openFile: infer F } ? F : never
    : never,
  setActiveTab: (tab: 'home' | 'workspace' | 'projects' | 'search' | 'settings') => void,
) {
  try {
    const { content, name } = await fsApi.read(filePath);
    openFile({ path: filePath, name, content });
    // Navigate to projects tab where editor lives (or stay in workspace on desktop)
    setActiveTab('projects');
  } catch (err) {
    console.error('Failed to open file:', err);
  }
}

// ─── AIWorkspaceView Component ──────────────────────────────────────────────

export function AIWorkspaceView() {
  const { sendMessage, status, stop } = useAiChat();
  const scrollPosition = useAiStore((s) => s.scrollPosition);
  const setScrollPosition = useAiStore((s) => s.setScrollPosition);
  const openFile = useAppStore((s) => s.openFile);
  const setActiveTab = useNavigationStore((s) => s.setActiveTab);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position on mount (when navigating back to this view)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && scrollPosition > 0) {
      container.scrollTop = scrollPosition;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save scroll position on unmount (when navigating away)
  useEffect(() => {
    return () => {
      const container = scrollContainerRef.current;
      if (container) {
        setScrollPosition(container.scrollTop);
      }
    };
  }, [setScrollPosition]);

  // Handle file reference clicks from the activity feed
  const handleFileClick = useCallback(
    (filePath: string) => {
      openFileInEditor(filePath, openFile, setActiveTab);
    },
    [openFile, setActiveTab],
  );

  // Attach file click handler to the feed container via event delegation
  const handleFeedClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const fileRef = target.closest('[data-file-ref]') as HTMLElement | null;
      if (fileRef) {
        e.preventDefault();
        const filePath = fileRef.getAttribute('data-file-ref');
        if (filePath) {
          handleFileClick(filePath);
        }
      }
    },
    [handleFileClick],
  );

  const isThinking = status === 'thinking';

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: 'var(--color-background)' }}
    >
      {/* Activity Feed (scrollable area) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        onClick={handleFeedClick}
      >
        <ActivityFeed />
      </div>

      {/* Agent Activity Feed (collapsible panel) */}
      <AgentActivityFeed />

      {/* Context Attachment Bar (above input) */}
      <ContextAttachmentBar />

      {/* Message Input */}
      <MessageInput
        onSend={sendMessage}
        disabled={isThinking}
      />

      {/* Stop button when AI is thinking */}
      {isThinking && (
        <div
          className="absolute bottom-[120px] left-1/2 -translate-x-1/2 z-10"
        >
          <button
            onClick={stop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-opacity hover:opacity-90"
            style={{
              background: 'var(--color-surface-3)',
              border: 'var(--border-default)',
              color: 'var(--color-text-secondary)',
            }}
            aria-label="Stop generation"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            Stop
          </button>
        </div>
      )}
    </div>
  );
}

export default AIWorkspaceView;
