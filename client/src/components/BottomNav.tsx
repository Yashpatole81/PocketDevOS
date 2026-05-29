import { cn } from "@/lib/utils";

export type MobilePanel = "terminal" | "editor" | "files" | "ai";

interface BottomNavProps {
  active: MobilePanel;
  onChange: (panel: MobilePanel) => void;
}

const tabs: { id: MobilePanel; label: string; icon: JSX.Element }[] = [
  {
    id: "terminal",
    label: "Terminal",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" />
      </svg>
    ),
  },
  {
    id: "files",
    label: "Files",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
  {
    id: "editor",
    label: "Editor",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" />
      </svg>
    ),
  },
  {
    id: "ai",
    label: "AI",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="m2 14 6-6" /><path d="m22 14-6-6" />
      </svg>
    ),
  },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="glass-dock flex items-center justify-around h-14 rounded-[var(--radius-dock)] px-2 safe-area-bottom">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all touch-target rounded-xl relative",
            active === tab.id
              ? "text-[var(--accent)]"
              : "text-[var(--text-muted)]",
          )}
        >
          {/* Active indicator glow */}
          {active === tab.id && (
            <div className="absolute inset-x-3 top-1 h-[2px] rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" />
          )}
          <span className={cn(
            "transition-transform",
            active === tab.id && "scale-110"
          )}>
            {tab.icon}
          </span>
          <span className={cn(
            "text-[9px] font-medium tracking-wide uppercase",
            active === tab.id ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
          )}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
