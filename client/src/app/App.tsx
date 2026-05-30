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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setAuthToken(token);
      window.history.replaceState({}, "", window.location.pathname);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const token = getAuthToken();
    fetch("/api/workspace", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: { home: string }) => setWorkspace(data.home))
      .catch(() => setWorkspace("/data/data/com.termux/files/home"));

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

  // ═══ MOBILE ═══
  if (isMobile) {
    return (
      <div
        className="flex flex-col w-full bg-black relative"
        style={{ height: `${viewportHeight}px` }}
      >
        {/* Top bar */}
        <div className="flex items-center h-12 px-4 border-b border-[var(--border)] shrink-0 safe-area-top">
          <div className="flex items-center gap-2 flex-1">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
            <span className="text-sm font-semibold text-white">PocketDevOS</span>
          </div>
          <button
            onClick={useSettingsStore.getState().openSettings}
            aria-label="Settings"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-secondary)] active:bg-[var(--bg-tertiary)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {mobilePanel === "terminal" && (
            <div className="h-full w-full animate-fade-in">
              {terminalSessionId ? (
                <TerminalPane key={terminalSessionId} sessionId={terminalSessionId} onExit={handleTerminalExit} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="text-sm text-[var(--text-muted)]">Connecting...</span>
                </div>
              )}
            </div>
          )}
          {mobilePanel === "editor" && (
            <div className="h-full w-full animate-fade-in">
              {activeFile ? (
                <EditorPane key={activeFile.path} filePath={activeFile.path} content={activeFile.content} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-[var(--text-muted)]">No file open</p>
                </div>
              )}
            </div>
          )}
          {mobilePanel === "files" && <div className="h-full w-full animate-fade-in"><FileExplorer /></div>}
          {mobilePanel === "ai" && <div className="h-full w-full animate-fade-in"><AiChat /></div>}
        </div>

        {/* Bottom dock */}
        <div className="px-4 pb-2 pt-1">
          <BottomNav active={mobilePanel} onChange={setMobilePanel} />
        </div>

        {settingsOpen && <SettingsPage />}
      </div>
    );
  }

  // ═══ DESKTOP ═══
  return (
    <div className="flex flex-col h-full w-full bg-black">
      {/* Top bar */}
      <div className="flex items-center h-10 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-3 gap-2 shrink-0">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" />
          </svg>
        </button>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 mx-2">
          {openFiles.map((file, index) => (
            <button
              key={file.path}
              onClick={() => setActiveFile(index)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap",
                index === activeFileIndex
                  ? "bg-[var(--bg-tertiary)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              {file.dirty && <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />}
              <span className="font-mono">{file.name}</span>
              <span
                onClick={(e) => { e.stopPropagation(); closeFile(file.path); }}
                className="ml-1 text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                ×
              </span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <button
          onClick={toggleAiPanel}
          aria-label="Toggle AI"
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            aiPanelOpen ? "bg-white text-black" : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)]",
          )}
        >
          AI
        </button>
        <button
          onClick={useSettingsStore.getState().openSettings}
          aria-label="Settings"
          className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {sidebarOpen && (
          <div className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--bg-sidebar)] overflow-hidden">
            <FileExplorer />
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="vertical">
            <Panel defaultSize={60} minSize={20}>
              <div className="h-full w-full overflow-hidden">
                {activeFile ? (
                  <EditorPane key={activeFile.path} filePath={activeFile.path} content={activeFile.content} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-base font-semibold text-[var(--text-secondary)]">PocketDevOS</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Open a file to start editing</p>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
            <PanelResizeHandle className="h-[1px] bg-[var(--border)] hover:bg-white/20 transition-colors cursor-row-resize" />
            <Panel defaultSize={40} minSize={10}>
              <div className="h-full w-full overflow-hidden">
                {terminalSessionId ? (
                  <TerminalPane key={terminalSessionId} sessionId={terminalSessionId} onExit={handleTerminalExit} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-sm text-[var(--text-muted)]">Connecting...</span>
                  </div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </div>

        {aiPanelOpen && (
          <div className="w-80 shrink-0 border-l border-[var(--border)] overflow-hidden bg-[var(--bg-secondary)]">
            <AiChat />
          </div>
        )}
      </div>

      <StatusBar />
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
