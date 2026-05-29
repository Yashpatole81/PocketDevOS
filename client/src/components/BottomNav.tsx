import { cn } from "@/lib/utils";

export type MobilePanel = "terminal" | "editor" | "files" | "ai";

interface BottomNavProps {
  active: MobilePanel;
  onChange: (panel: MobilePanel) => void;
}

const tabs: { id: MobilePanel; label: string; icon: string }[] = [
  { id: "terminal", label: "Terminal", icon: "💻" },
  { id: "editor", label: "Editor", icon: "📝" },
  { id: "files", label: "Files", icon: "📁" },
  { id: "ai", label: "AI", icon: "🤖" },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="flex items-center justify-around h-14 bg-[var(--bg-secondary)] border-t border-[var(--border)] shrink-0 safe-area-bottom">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors touch-target",
            active === tab.id
              ? "text-[var(--accent)]"
              : "text-[var(--text-secondary)]",
          )}
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
