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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" />
      </svg>
    ),
  },
  {
    id: "files",
    label: "Files",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </svg>
    ),
  },
  {
    id: "editor",
    label: "Editor",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" />
      </svg>
    ),
  },
  {
    id: "ai",
    label: "AI",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="m2 14 6-6" /><path d="m22 14-6-6" />
      </svg>
    ),
  },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="glass-dock flex items-center justify-around h-16 rounded-[var(--radius-dock)] safe-area-bottom">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          aria-label={tab.label}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 touch-target rounded-xl transition-opacity",
            active === tab.id
              ? "text-white opacity-100"
              : "text-[var(--text-muted)] opacity-60",
          )}
        >
          {tab.icon}
          <span className="text-[10px] font-medium">{tab.label}</span>
          {active === tab.id && (
            <span className="absolute bottom-2 w-1 h-1 rounded-full bg-white" />
          )}
        </button>
      ))}
    </nav>
  );
}
