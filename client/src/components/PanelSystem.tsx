import { useCallback, useMemo } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import {
  usePanelStore,
  type PanelConfig,
  type PanelId,
  type DockPosition,
} from "@/store/panelStore";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minimum panel width in pixels */
const MIN_WIDTH_PX = 200;
/** Minimum panel height in pixels */
const MIN_HEIGHT_PX = 120;

/**
 * Convert pixel-based minimum to a percentage of the container.
 * react-resizable-panels uses percentage-based minSize.
 * We estimate based on a reasonable viewport width/height.
 */
function minWidthPercent(containerWidthEstimate = 1200): number {
  return Math.ceil((MIN_WIDTH_PX / containerWidthEstimate) * 100);
}

function minHeightPercent(containerHeightEstimate = 800): number {
  return Math.ceil((MIN_HEIGHT_PX / containerHeightEstimate) * 100);
}

// ─── Panel Content Placeholders ─────────────────────────────────────────────

interface PanelContentProps {
  panelId: PanelId;
}

const panelLabels: Record<PanelId, string> = {
  ai: "AI Workspace",
  terminal: "Terminal",
  editor: "Editor",
  files: "File Explorer",
  git: "Git",
  logs: "Logs",
  preview: "Preview",
  search: "Search",
};

const panelIcons: Record<PanelId, string> = {
  ai: "🤖",
  terminal: "⌨️",
  editor: "📝",
  files: "📁",
  git: "🔀",
  logs: "📋",
  preview: "👁️",
  search: "🔍",
};

function PanelContent({ panelId }: PanelContentProps) {
  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-surface-1)]">
      <div
        className={cn(
          "flex items-center gap-2 px-3 h-8 min-h-8",
          "border-b border-[var(--color-border)]",
          "text-xs font-medium text-[var(--color-text-secondary)]"
        )}
      >
        <span>{panelIcons[panelId]}</span>
        <span>{panelLabels[panelId]}</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
        {panelLabels[panelId]} panel
      </div>
    </div>
  );
}

// ─── Resize Handle ──────────────────────────────────────────────────────────

interface ResizeHandleProps {
  direction: "horizontal" | "vertical";
}

function ResizeHandle({ direction }: ResizeHandleProps) {
  return (
    <PanelResizeHandle
      className={cn(
        "relative flex items-center justify-center",
        "bg-transparent hover:bg-[rgba(255,255,255,0.06)]",
        "transition-colors duration-150",
        direction === "horizontal"
          ? "w-1 cursor-col-resize"
          : "h-1 cursor-row-resize"
      )}
    >
      <div
        className={cn(
          "rounded-full bg-[var(--color-border)]",
          direction === "horizontal" ? "w-0.5 h-8" : "h-0.5 w-8"
        )}
      />
    </PanelResizeHandle>
  );
}

// ─── Floating Panel ─────────────────────────────────────────────────────────

interface FloatingPanelProps {
  panel: PanelConfig;
}

function FloatingPanel({ panel }: FloatingPanelProps) {
  return (
    <div
      className={cn(
        "absolute z-50 rounded-lg overflow-hidden",
        "border border-[var(--color-border)]",
        "shadow-lg bg-[var(--color-surface-1)]"
      )}
      style={{
        width: Math.max(panel.width ?? MIN_WIDTH_PX, MIN_WIDTH_PX),
        height: Math.max(panel.height ?? MIN_HEIGHT_PX * 2, MIN_HEIGHT_PX),
        top: 80,
        right: 80,
      }}
    >
      <PanelContent panelId={panel.id} />
    </div>
  );
}

// ─── PanelSystem Component ──────────────────────────────────────────────────

export interface PanelSystemProps {
  /** Optional className for the container */
  className?: string;
}

export function PanelSystem({ className }: PanelSystemProps) {
  const { panels, persistLayout, resizePanel } = usePanelStore();

  // Group visible panels by dock position
  const { leftPanels, rightPanels, bottomPanels, floatPanels } = useMemo(() => {
    const visible = panels.filter((p) => p.visible);
    const grouped: Record<DockPosition, PanelConfig[]> = {
      left: [],
      right: [],
      bottom: [],
      float: [],
    };
    for (const panel of visible) {
      grouped[panel.position].push(panel);
    }
    // Sort each group by order
    for (const key of Object.keys(grouped) as DockPosition[]) {
      grouped[key].sort((a, b) => a.order - b.order);
    }
    return {
      leftPanels: grouped.left,
      rightPanels: grouped.right,
      bottomPanels: grouped.bottom,
      floatPanels: grouped.float,
    };
  }, [panels]);

  // Persist layout on any resize
  const handleLayoutChange = useCallback(() => {
    persistLayout();
  }, [persistLayout]);

  // Handle horizontal panel resize (left/right panels)
  const handleHorizontalResize = useCallback(
    (sizes: number[]) => {
      // Map sizes back to panels in the horizontal group
      const horizontalPanels = [...leftPanels, ...rightPanels];
      // Estimate container width for pixel conversion
      const containerWidth =
        typeof window !== "undefined" ? window.innerWidth - 48 : 1200; // subtract sidebar width

      horizontalPanels.forEach((panel, index) => {
        if (sizes[index] !== undefined) {
          const widthPx = Math.round((sizes[index] / 100) * containerWidth);
          resizePanel(panel.id, widthPx, undefined);
        }
      });
      handleLayoutChange();
    },
    [leftPanels, rightPanels, resizePanel, handleLayoutChange]
  );

  // Handle vertical panel resize (bottom panels)
  const handleVerticalResize = useCallback(
    (sizes: number[]) => {
      const containerHeight =
        typeof window !== "undefined" ? window.innerHeight : 800;

      // The vertical group has: main content area + bottom panels
      // Bottom panels start at index 1
      bottomPanels.forEach((panel, index) => {
        const sizeIndex = index + 1; // offset by 1 for the main content area
        if (sizes[sizeIndex] !== undefined) {
          const heightPx = Math.round(
            (sizes[sizeIndex] / 100) * containerHeight
          );
          resizePanel(panel.id, undefined, heightPx);
        }
      });
      handleLayoutChange();
    },
    [bottomPanels, resizePanel, handleLayoutChange]
  );

  const hasLeftOrRight = leftPanels.length > 0 || rightPanels.length > 0;
  const hasBottom = bottomPanels.length > 0;

  // Calculate min sizes as percentages
  const hMinSize = minWidthPercent();
  const vMinSize = minHeightPercent();

  return (
    <div className={cn("relative flex-1 h-full overflow-hidden", className)}>
      {/* Main resizable layout */}
      {hasLeftOrRight || hasBottom ? (
        <PanelGroup
          direction="vertical"
          onLayout={handleVerticalResize}
          className="h-full"
        >
          {/* Top section: horizontal panels (left + right) */}
          <Panel defaultSize={hasBottom ? 70 : 100} minSize={vMinSize}>
            {hasLeftOrRight ? (
              <PanelGroup
                direction="horizontal"
                onLayout={handleHorizontalResize}
                className="h-full"
              >
                {/* Left panels */}
                {leftPanels.map((panel, index) => (
                  <PanelWithHandle
                    key={panel.id}
                    panel={panel}
                    minSize={hMinSize}
                    showHandle={
                      index < leftPanels.length - 1 ||
                      rightPanels.length > 0
                    }
                    handleDirection="horizontal"
                  />
                ))}

                {/* Right panels */}
                {rightPanels.map((panel, index) => (
                  <PanelWithHandle
                    key={panel.id}
                    panel={panel}
                    minSize={hMinSize}
                    showHandle={index < rightPanels.length - 1}
                    handleDirection="horizontal"
                  />
                ))}
              </PanelGroup>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                No panels docked left or right
              </div>
            )}
          </Panel>

          {/* Bottom panels */}
          {hasBottom && (
            <>
              <ResizeHandle direction="vertical" />
              {bottomPanels.length === 1 ? (
                <Panel
                  defaultSize={30}
                  minSize={vMinSize}
                  id={`panel-${bottomPanels[0].id}`}
                >
                  <PanelContent panelId={bottomPanels[0].id} />
                </Panel>
              ) : (
                <Panel defaultSize={30} minSize={vMinSize}>
                  <PanelGroup direction="horizontal">
                    {bottomPanels.map((panel, index) => (
                      <PanelWithHandle
                        key={panel.id}
                        panel={panel}
                        minSize={hMinSize}
                        showHandle={index < bottomPanels.length - 1}
                        handleDirection="horizontal"
                      />
                    ))}
                  </PanelGroup>
                </Panel>
              )}
            </>
          )}
        </PanelGroup>
      ) : (
        <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
          No visible panels. Toggle panels from the sidebar.
        </div>
      )}

      {/* Floating panels rendered as absolute-positioned overlays */}
      {floatPanels.map((panel) => (
        <FloatingPanel key={panel.id} panel={panel} />
      ))}
    </div>
  );
}

// ─── Helper: Panel with optional resize handle ──────────────────────────────

interface PanelWithHandleProps {
  panel: PanelConfig;
  minSize: number;
  showHandle: boolean;
  handleDirection: "horizontal" | "vertical";
}

function PanelWithHandle({
  panel,
  minSize,
  showHandle,
  handleDirection,
}: PanelWithHandleProps) {
  return (
    <>
      <Panel minSize={minSize} id={`panel-${panel.id}`}>
        <PanelContent panelId={panel.id} />
      </Panel>
      {showHandle && <ResizeHandle direction={handleDirection} />}
    </>
  );
}
