import { useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { useTheme } from "@/modules/theme";
import { themes } from "@/modules/theme/themes";
import { AiSettings } from "@/modules/ai/AiSettings";
import { cn } from "@/lib/utils";

type SettingsTab = "general" | "editor" | "terminal" | "ai" | "about";

function GeneralSection() {
  const { theme, setTheme } = useTheme();
  const { general, setGeneral } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">Theme</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                setGeneral({ theme: t.id });
              }}
              className={cn(
                "p-2.5 rounded-xl border transition-all text-left group",
                theme.id === t.id
                  ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-[0_0_12px_var(--accent-glow)]"
                  : "border-[var(--border-subtle)] hover:border-[var(--border)] bg-[var(--bg-primary)]",
              )}
            >
              <div
                className="w-full h-7 rounded-lg mb-2 flex gap-0.5 overflow-hidden border border-black/20"
                style={{ background: t.colors.background }}
              >
                <div className="w-1/4 h-full" style={{ background: t.colors.surface1 }} />
                <div className="flex-1 h-full flex flex-col gap-0.5 p-1 justify-center">
                  <div className="h-[2px] rounded-full" style={{ background: t.colors.accent, width: "60%" }} />
                  <div className="h-[2px] rounded-full" style={{ background: t.colors.textMuted, width: "80%" }} />
                  <div className="h-[2px] rounded-full" style={{ background: t.colors.textMuted, width: "45%" }} />
                </div>
              </div>
              <span className="text-[10px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2">Workspace</h3>
        <input
          type="text"
          value={general.workspacePath}
          onChange={(e) => setGeneral({ workspacePath: e.target.value })}
          placeholder="~/projects"
          className="w-full px-3 py-2 rounded-lg text-[11px] bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--accent)]/40 focus:shadow-[0_0_8px_var(--accent-glow)] transition-all font-[var(--font-mono)]"
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
        <label className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-2">
          <span className="font-medium">Font Size</span>
          <span className="font-[var(--font-mono)] text-[var(--accent)]">{editor.fontSize}px</span>
        </label>
        <input
          type="range"
          min={12}
          max={24}
          value={editor.fontSize}
          onChange={(e) => setEditor({ fontSize: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-[11px] font-medium text-[var(--text-secondary)] mb-2 block">Tab Size</label>
        <div className="flex gap-2">
          {([2, 4] as const).map((size) => (
            <button
              key={size}
              onClick={() => setEditor({ tabSize: size })}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all font-[var(--font-mono)]",
                editor.tabSize === size
                  ? "bg-[var(--accent)] text-white shadow-[0_0_8px_var(--accent-glow)]"
                  : "bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]",
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <ToggleRow
        label="Word Wrap"
        value={editor.wordWrap}
        onChange={() => setEditor({ wordWrap: !editor.wordWrap })}
      />

      <ToggleRow
        label="Vim Mode"
        subtitle="Experimental"
        value={editor.vimMode}
        onChange={() => setEditor({ vimMode: !editor.vimMode })}
      />
    </div>
  );
}

function TerminalSection() {
  const { terminal, setTerminal } = useSettingsStore();

  return (
    <div className="space-y-5">
      <div>
        <label className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-2">
          <span className="font-medium">Font Size</span>
          <span className="font-[var(--font-mono)] text-[var(--accent)]">{terminal.fontSize}px</span>
        </label>
        <input
          type="range"
          min={12}
          max={20}
          value={terminal.fontSize}
          onChange={(e) => setTerminal({ fontSize: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-2">
          <span className="font-medium">Scrollback</span>
          <span className="font-[var(--font-mono)] text-[var(--accent)]">{terminal.scrollbackLines}</span>
        </label>
        <input
          type="range"
          min={500}
          max={10000}
          step={500}
          value={terminal.scrollbackLines}
          onChange={(e) => setTerminal({ scrollbackLines: Number(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
        <div>
          <h3 className="text-[12px] font-semibold text-[var(--text-primary)]">PocketDevOS</h3>
          <p className="text-[10px] text-[var(--text-muted)] font-[var(--font-mono)]">v0.1.0</p>
        </div>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        AI-native developer workspace. Built with React, xterm.js, CodeMirror, and autonomous AI assistance.
      </p>
      <div className="space-y-1.5">
        <a
          href="https://github.com/Yashpatole81/PocketDevOS"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
        >
          → GitHub Repository
        </a>
      </div>
    </div>
  );
}

function ToggleRow({ label, subtitle, value, onChange }: { label: string; subtitle?: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">{label}</span>
        {subtitle && <p className="text-[9px] text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      <button
        onClick={onChange}
        className={cn(
          "w-9 h-5 rounded-full transition-all relative",
          value ? "bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" : "bg-[var(--border)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
            value ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
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

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "editor", label: "Editor" },
    { id: "terminal", label: "Terminal" },
    { id: "ai", label: "AI" },
    { id: "about", label: "About" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-overlay)] backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg max-h-[85vh] bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)] flex flex-col overflow-hidden shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
          <h2 className="text-[12px] font-semibold text-[var(--text-primary)]">Settings</h2>
          <button
            onClick={closeSettings}
            className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[var(--border-subtle)] px-3 shrink-0 overflow-x-auto gap-0.5">
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
                "px-3 py-2 text-[10px] font-medium whitespace-nowrap transition-all border-b-2 uppercase tracking-wide",
                activeTab === tab.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
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
