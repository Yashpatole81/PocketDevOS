import { useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { useTheme, themes } from "@/modules/theme";
import { AiSettings } from "@/modules/ai/AiSettings";
import { cn } from "@/lib/utils";

type SettingsTab = "general" | "editor" | "terminal" | "ai" | "about";

function GeneralSection() {
  const { theme, setTheme } = useTheme();
  const { general, setGeneral } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Theme</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                setGeneral({ theme: t.id });
              }}
              className={cn(
                "p-3 rounded-lg border transition-all text-left",
                theme.id === t.id
                  ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                  : "border-[var(--border)] hover:border-[var(--text-secondary)]",
              )}
            >
              {/* Theme preview */}
              <div
                className="w-full h-8 rounded mb-2 flex gap-0.5 overflow-hidden"
                style={{ background: t.colors.bgPrimary }}
              >
                <div className="w-1/4 h-full" style={{ background: t.colors.bgSecondary }} />
                <div className="flex-1 h-full flex flex-col gap-0.5 p-1">
                  <div className="h-1 rounded" style={{ background: t.colors.accent, width: "60%" }} />
                  <div className="h-1 rounded" style={{ background: t.colors.textSecondary, width: "80%" }} />
                  <div className="h-1 rounded" style={{ background: t.colors.textSecondary, width: "40%" }} />
                </div>
              </div>
              <span className="text-xs text-[var(--text-primary)]">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Workspace Path</h3>
        <input
          type="text"
          value={general.workspacePath}
          onChange={(e) => setGeneral({ workspacePath: e.target.value })}
          placeholder="/data/data/com.termux/files/home"
          className="w-full px-3 py-2 rounded text-sm bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
        />
      </div>
    </div>
  );
}

function EditorSection() {
  const { editor, setEditor } = useSettingsStore();

  return (
    <div className="space-y-5">
      <div>
        <label className="flex items-center justify-between text-sm text-[var(--text-primary)] mb-2">
          <span>Font Size</span>
          <span className="text-xs text-[var(--text-secondary)]">{editor.fontSize}px</span>
        </label>
        <input
          type="range"
          min={12}
          max={24}
          value={editor.fontSize}
          onChange={(e) => setEditor({ fontSize: Number(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
      </div>

      <div>
        <label className="text-sm text-[var(--text-primary)] mb-2 block">Tab Size</label>
        <div className="flex gap-2">
          {([2, 4] as const).map((size) => (
            <button
              key={size}
              onClick={() => setEditor({ tabSize: size })}
              className={cn(
                "px-4 py-2 rounded text-sm transition-colors",
                editor.tabSize === size
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]",
              )}
            >
              {size} spaces
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary)]">Word Wrap</span>
        <button
          onClick={() => setEditor({ wordWrap: !editor.wordWrap })}
          className={cn(
            "w-10 h-5 rounded-full transition-colors relative",
            editor.wordWrap ? "bg-[var(--accent)]" : "bg-[var(--border)]",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
              editor.wordWrap ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-[var(--text-primary)]">Vim Mode</span>
          <p className="text-[10px] text-[var(--text-secondary)]">Coming soon</p>
        </div>
        <button
          onClick={() => setEditor({ vimMode: !editor.vimMode })}
          className={cn(
            "w-10 h-5 rounded-full transition-colors relative",
            editor.vimMode ? "bg-[var(--accent)]" : "bg-[var(--border)]",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
              editor.vimMode ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>
    </div>
  );
}

function TerminalSection() {
  const { terminal, setTerminal } = useSettingsStore();

  return (
    <div className="space-y-5">
      <div>
        <label className="flex items-center justify-between text-sm text-[var(--text-primary)] mb-2">
          <span>Font Size</span>
          <span className="text-xs text-[var(--text-secondary)]">{terminal.fontSize}px</span>
        </label>
        <input
          type="range"
          min={12}
          max={20}
          value={terminal.fontSize}
          onChange={(e) => setTerminal({ fontSize: Number(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
      </div>

      <div>
        <label className="flex items-center justify-between text-sm text-[var(--text-primary)] mb-2">
          <span>Scrollback Lines</span>
          <span className="text-xs text-[var(--text-secondary)]">{terminal.scrollbackLines}</span>
        </label>
        <input
          type="range"
          min={500}
          max={10000}
          step={500}
          value={terminal.scrollbackLines}
          onChange={(e) => setTerminal({ scrollbackLines: Number(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)]">PocketDevOS</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Version 0.1.0</p>
      </div>
      <div className="text-xs text-[var(--text-secondary)] space-y-2">
        <p>A mobile-first development environment that runs anywhere.</p>
        <p>Built with React, xterm.js, CodeMirror, and AI-powered assistance.</p>
      </div>
      <div className="space-y-1">
        <a
          href="https://github.com/pocketdevos"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-[var(--accent)] hover:underline"
        >
          GitHub Repository
        </a>
        <a
          href="https://github.com/pocketdevos/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-[var(--accent)] hover:underline"
        >
          Report an Issue
        </a>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const closeSettings = useSettingsStore((s) => s.closeSettings);
  const [showAiSettings, setShowAiSettings] = useState(false);

  if (showAiSettings) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col">
        <AiSettings onClose={() => setShowAiSettings(false)} />
      </div>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "editor", label: "Editor", icon: "📝" },
    { id: "terminal", label: "Terminal", icon: "💻" },
    { id: "ai", label: "AI", icon: "🤖" },
    { id: "about", label: "About", icon: "ℹ️" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[90vh] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">Settings</h2>
          <button
            onClick={closeSettings}
            className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[var(--border)] px-2 shrink-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "ai") {
                  setShowAiSettings(true);
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={cn(
                "px-3 py-2 text-xs whitespace-nowrap transition-colors border-b-2",
                activeTab === tab.id
                  ? "border-[var(--accent)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "general" && <GeneralSection />}
          {activeTab === "editor" && <EditorSection />}
          {activeTab === "terminal" && <TerminalSection />}
          {activeTab === "about" && <AboutSection />}
        </div>
      </div>
    </div>
  );
}
