import { useAppStore } from "@/store/appStore";
import { useAiStore } from "@/store/aiStore";
import { useTheme } from "@/modules/theme";
import { cn } from "@/lib/utils";

interface StatusBarProps {
  isMobile?: boolean;
}

export function StatusBar({ isMobile }: StatusBarProps) {
  const activeFileIndex = useAppStore((s) => s.activeFileIndex);
  const openFiles = useAppStore((s) => s.openFiles);
  const aiStatus = useAiStore((s) => s.status);
  const { theme } = useTheme();

  const activeFile = activeFileIndex >= 0 ? openFiles[activeFileIndex] : null;

  const aiStatusConfig = {
    idle: { color: "bg-[var(--success)]", label: "ready" },
    thinking: { color: "bg-[var(--accent)] animate-pulse", label: "thinking" },
    "awaiting-approval": { color: "bg-[var(--warning)] animate-pulse", label: "awaiting" },
    error: { color: "bg-[var(--danger)]", label: "error" },
  };

  const status = aiStatusConfig[aiStatus];

  if (isMobile) return null; // Mobile uses the command bar instead

  return (
    <div className="flex items-center h-6 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] px-3 text-[10px] shrink-0 font-[var(--font-mono)]">
      {/* Left section */}
      <div className="flex items-center gap-3 text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" /><line x1="1.05" x2="7" y1="12" y2="12" /><line x1="17.01" x2="22.96" y1="12" y2="12" />
          </svg>
          <span>main</span>
        </span>
        {activeFile && (
          <span className="text-[var(--text-muted)]">UTF-8</span>
        )}
      </div>

      {/* Center */}
      <div className="flex-1 text-center text-[var(--text-muted)]">
        {activeFile && (
          <span className="opacity-75">{activeFile.name}</span>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3 text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full", status.color)} />
          <span>AI: {status.label}</span>
        </span>
        <span className="opacity-60">{theme.name}</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
        </span>
      </div>
    </div>
  );
}
