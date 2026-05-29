import { useEffect, useState, useCallback } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { terminal as terminalApi, setAuthToken, getAuthToken } from "@/lib/api";
import { TerminalPane } from "@/modules/terminal";
import { FileExplorer } from "@/modules/explorer";
import { EditorPane } from "@/modules/editor";
import { AiChat } from "@/modules/ai";
import { SettingsPage } from "@/modules/settings";
import { ThemeProvider } from "@/modules/theme";
import { StatusBar } from "@/components/StatusBar";
import { BottomNav, type MobilePanel } from "@/components/BottomNav";
import { useAppStore } from "@/store/appStore";
import { useAiStore } from "@/store/aiStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useIsMobile, useViewportHeight } from "@/lib/useIsMobile";
import { useShortcuts } from "@/lib/useShortcuts";
import { cn } from "@/lib/utils";

function AppContent() {
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("terminal");

  const isMobile = useIsMobile();
  const viewportHeight = useViewportHeight();

  const {
    openFiles,
    activeFileIndex,
    sidebarOpen,
    toggleSidebar,
    closeFile,
    setActiveFile,
    setWorkspace,
  } = useAppStore();

  const { panelOpen: aiPanelOpen, togglePanel: toggleAiPanel } = useAiStore();
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);

  const activeFile = activeFileIndex >= 0 ? openFiles[activeFileIndex] : null;

  useShortcuts();

  // Extract auth token from URL on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setAuthToken(token);
      window.history.replaceState({}, "", window.location.pathname);
    }
    setReady(true);
  }, []);

  // Set default workspace and create terminal on mount
  useEffect(() => {
    if (!ready) return;

    const token = getAuthToken();
    fetch("/api/workspace", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: { home: string }) => {
        setWorkspace(data.home);
      })
      .catch(() => {
        setWorkspace("/data/data/com.termux/files/home");
      });

    terminalApi
      .create({})
      .then((session) => setTerminalSessionId(session.id))
      .catch((err) => console.error("Failed to create terminal:", err));
  }, [ready, setWorkspace]);

  const handleTerminalExit = useCallback(() => {
    terminalApi
      .create({})
      .then((session) => setTerminalSessionId(session.id))
      .catch(() => setTerminalSessionId(null));
  }, []);

  // ═══ Mobile Layout ═══
  if (isMobile) {
    return (
      <div
        className="flex flex-col w-full bg-[var(--bg-primary)] relative"
        style={{ height: `${viewportHeight}px` }}
      >
        {/* Command Bar - translucent top */}
        <div className="glass flex items-center h-11 px-3 gap-2 shrink-0 safe-area-top z-10">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Workspace indicator */}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
              <span className="text-[11px] font-medium text-[var(--text-primary)] font-[var(--font-mono)] truncate max-w-[120px]">
                PocketDevOS
              </span>
            </div>
            {/* Git branch */}
            <span className="text-[10px] text-[var(--text-muted)] font-[var(--font-mono)] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)]">
              main
            </span>
          </div>
          {/* Right actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleAiPanel}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg transition-all",
                aiPanelOpen
                  ? "bg-[var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="m2 14 6-6" /><path d="m22 14-6-6" />
              </svg>
            </button>
            <button
              onClick={useSettingsStore.getState().openSettings}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main workspace area */}
        <div className="flex-1 overflow-hidden relative">
          {mobilePanel === "terminal" && (
            <div className="h-full w-full animate-fade-in">
              {terminalSessionId ? (
                <TerminalPane
                  key={terminalSessionId}
                  sessionId={terminalSessionId}
                  onExit={handleTerminalExit}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-xs font-[var(--font-mono)]">
                  <span className="animate-pulse-glow px-3 py-1.5 rounded-lg border border-[var(--border)]">
                    connecting...
                  </span>
                </div>
              )}
            </div>
          )}

          {mobilePanel === "editor" && (
            <div className="h-full w-full animate-fade-in">
              {activeFile ? (
                <EditorPane
                  key={activeFile.path}
                  filePath={activeFile.path}
                  content={activeFile.content}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-center px-6">
                  <div className="space-y-3">
                    <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" />
                      </svg>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">Open a file to start editing</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {mobilePanel === "files" && (
            <div className="h-full w-full animate-fade-in">
              <FileExplorer />
            </div>
          )}

          {mobilePanel === "ai" && (
            <div className="h-full w-full animate-fade-in">
              <AiChat />
            </div>
          )}
        </div>

        {/* Floating bottom dock */}
        <div className="absolute bottom-3 left-4 right-4 z-20">
          <BottomNav active={mobilePanel} onChange={setMobilePanel} />
        </div>

        {/* Settings overlay */}
        {settingsOpen && <SettingsPage />}
      </div>
    );
  }

  // ═══ Desktop Layout ═══
  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-primary)]">
      {/* Top Command Bar */}
      <div className="flex items-center h-10 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-3 gap-2 shrink-0">
        {/* Left: Sidebar toggle + workspace */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
            title="Toggle sidebar (Ctrl+B)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
            <span className="text-[11px] font-medium text-[var(--text-secondary)] font-[var(--font-mono)]">
              main
            </span>
          </div>
        </div>

        {/* Center: File tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 mx-3 scrollbar-none">
          {openFiles.map((file, index) => (
            <button
              key={file.path}
              onClick={() => setActiveFile(index)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap font-[var(--font-mono)]",
                index === activeFileIndex
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-active)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50",
              )}
            >
              {file.dirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />
              )}
              <span>{file.name}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.path);
                }}
                className="ml-1 opacity-0 group-hover:opacity-100 hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--danger)] cursor-pointer transition-opacity"
              >
                ×
              </span>
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleAiPanel}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
              aiPanelOpen
                ? "bg-[var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]",
            )}
            title="Toggle AI panel (Ctrl+J)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="m2 14 6-6" /><path d="m22 14-6-6" />
            </svg>
            <span>AI</span>
          </button>
          <button
            onClick={useSettingsStore.getState().openSettings}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
            title="Settings (Ctrl+,)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg-sidebar)] overflow-hidden animate-fade-in">
            <FileExplorer />
          </div>
        )}

        {/* Editor + Terminal */}
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="vertical">
            {/* Editor Panel */}
            <Panel defaultSize={60} minSize={20}>
              <div className="h-full w-full overflow-hidden">
                {activeFile ? (
                  <EditorPane
                    key={activeFile.path}
                    filePath={activeFile.path}
                    content={activeFile.content}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-secondary)] font-[var(--font-display)]">PocketDevOS</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Open a file to start editing</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* Resize Handle */}
            <PanelResizeHandle className="h-[3px] bg-[var(--border-subtle)] hover:bg-[var(--accent)] transition-colors cursor-row-resize relative group">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-[var(--border)] group-hover:bg-[var(--accent)] transition-colors" />
            </PanelResizeHandle>

            {/* Terminal Panel */}
            <Panel defaultSize={40} minSize={10}>
              <div className="h-full w-full overflow-hidden bg-[var(--bg-terminal)]">
                {terminalSessionId ? (
                  <TerminalPane
                    key={terminalSessionId}
                    sessionId={terminalSessionId}
                    onExit={handleTerminalExit}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-xs font-[var(--font-mono)]">
                    <span className="animate-pulse-glow px-3 py-1.5 rounded-lg border border-[var(--border)]">
                      connecting terminal...
                    </span>
                  </div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </div>

        {/* AI Panel (right side) */}
        {aiPanelOpen && (
          <div className="w-80 shrink-0 border-l border-[var(--border)] overflow-hidden animate-fade-in bg-[var(--bg-secondary)]">
            <AiChat />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Settings overlay */}
      {settingsOpen && <SettingsPage />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
