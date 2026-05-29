import { useEffect, useState, useCallback } from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { terminal as terminalApi, setAuthToken } from "@/lib/api";
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

  // Register keyboard shortcuts
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

    const defaultWorkspace = "/data/data/com.termux/files/home";
    setWorkspace(defaultWorkspace);

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

  // Mobile layout
  if (isMobile) {
    return (
      <div
        className="flex flex-col w-full bg-[var(--bg-primary)]"
        style={{ height: `${viewportHeight}px` }}
      >
        {/* Mobile content area - single panel at a time */}
        <div className="flex-1 overflow-hidden">
          {mobilePanel === "terminal" && (
            <div className="h-full w-full">
              {terminalSessionId ? (
                <TerminalPane
                  key={terminalSessionId}
                  sessionId={terminalSessionId}
                  onExit={handleTerminalExit}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm">
                  Connecting terminal...
                </div>
              )}
            </div>
          )}

          {mobilePanel === "editor" && (
            <div className="h-full w-full">
              {activeFile ? (
                <EditorPane
                  key={activeFile.path}
                  filePath={activeFile.path}
                  content={activeFile.content}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-secondary)] p-4 text-center">
                  <div>
                    <p className="text-sm mb-1">No file open</p>
                    <p className="text-xs">Open a file from the Files tab</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {mobilePanel === "files" && (
            <div className="h-full w-full">
              <FileExplorer />
            </div>
          )}

          {mobilePanel === "ai" && (
            <div className="h-full w-full">
              <AiChat />
            </div>
          )}
        </div>

        {/* Mobile status bar */}
        <StatusBar isMobile />

        {/* Bottom navigation */}
        <BottomNav active={mobilePanel} onChange={setMobilePanel} />

        {/* Settings overlay */}
        {settingsOpen && <SettingsPage />}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-primary)]">
      {/* Top Bar */}
      <div className="flex items-center h-9 bg-[var(--bg-secondary)] border-b border-[var(--border)] px-2 gap-1 shrink-0">
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="Toggle sidebar (Ctrl+B)"
        >
          ☰
        </button>

        {/* File tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 mx-2">
          {openFiles.map((file, index) => (
            <button
              key={file.path}
              onClick={() => setActiveFile(index)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors whitespace-nowrap",
                index === activeFileIndex
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              <span>
                {file.dirty && "● "}
                {file.name}
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.path);
                }}
                className="ml-1 opacity-50 hover:opacity-100 cursor-pointer"
              >
                ×
              </span>
            </button>
          ))}
        </div>

        {/* AI toggle button */}
        <button
          onClick={toggleAiPanel}
          className={cn(
            "px-2 py-1 text-xs transition-colors rounded",
            aiPanelOpen
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          )}
          title="Toggle AI panel (Ctrl+J)"
        >
          🤖
        </button>

        {/* Settings button */}
        <button
          onClick={useSettingsStore.getState().openSettings}
          className="px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="Settings (Ctrl+,)"
        >
          ⚙️
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-60 shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
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
                  <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                    <div className="text-center">
                      <p className="text-lg mb-2">PocketDevOS</p>
                      <p className="text-sm">Open a file from the explorer to start editing</p>
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* Resize Handle */}
            <PanelResizeHandle className="h-1 bg-[var(--border)] hover:bg-[var(--accent)] transition-colors cursor-row-resize" />

            {/* Terminal Panel */}
            <Panel defaultSize={40} minSize={10}>
              <div className="h-full w-full overflow-hidden">
                {terminalSessionId ? (
                  <TerminalPane
                    key={terminalSessionId}
                    sessionId={terminalSessionId}
                    onExit={handleTerminalExit}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm">
                    Connecting terminal...
                  </div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </div>

        {/* AI Panel (right side) */}
        {aiPanelOpen && (
          <div className="w-80 shrink-0 border-l border-[var(--border)] overflow-hidden">
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
