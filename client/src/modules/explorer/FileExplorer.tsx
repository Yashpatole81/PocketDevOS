import { useState, useCallback, useEffect } from "react";
import { fs as fsApi, type FsEntry } from "@/lib/api";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";

interface TreeNode extends FsEntry {
  children?: TreeNode[];
  expanded?: boolean;
  loading?: boolean;
}

function getFileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "#38BDF8"; // info blue
    case "js":
    case "jsx":
      return "#FBBF24"; // yellow
    case "rs":
      return "#FB923C"; // bronze/orange
    case "py":
      return "#4ADE80"; // green
    case "md":
    case "mdx":
      return "#67E8F9"; // cyan
    case "json":
      return "#A78BFA"; // purple
    case "css":
    case "scss":
      return "#F472B6"; // pink
    case "html":
      return "#FB923C"; // orange
    case "sh":
    case "bash":
      return "#4ADE80"; // green
    case "yaml":
    case "yml":
    case "toml":
      return "#94A3B8"; // muted
    default:
      return "#94A3B8";
  }
}

interface FileTreeItemProps {
  node: TreeNode;
  depth: number;
  onToggle: (path: string) => void;
  onFileClick: (entry: FsEntry) => void;
}

function FileTreeItem({ node, depth, onToggle, onFileClick }: FileTreeItemProps) {
  const handleClick = () => {
    if (node.isDirectory) {
      onToggle(node.path);
    } else {
      onFileClick(node);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center w-full px-2 py-[3px] text-left text-[11px]",
          "hover:bg-[var(--bg-tertiary)] transition-colors rounded-sm group",
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        )}
        style={{ paddingLeft: `${depth * 12 + 10}px` }}
      >
        {/* Expand/collapse indicator */}
        {node.isDirectory && (
          <span className={cn(
            "mr-1 text-[8px] text-[var(--text-muted)] transition-transform",
            node.expanded && "rotate-90"
          )}>
            ▶
          </span>
        )}
        {!node.isDirectory && <span className="w-[10px] mr-1" />}

        {/* File/folder icon */}
        {node.isDirectory ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 shrink-0">
            {node.expanded ? (
              <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
            ) : (
              <>
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              </>
            )}
          </svg>
        ) : (
          <span
            className="w-1.5 h-1.5 rounded-full mr-2 shrink-0"
            style={{ backgroundColor: getFileColor(node.name) }}
          />
        )}

        <span className="truncate font-[var(--font-mono)] text-[11px]">{node.name}</span>

        {node.loading && (
          <span className="ml-auto text-[9px] text-[var(--accent)] animate-pulse">●</span>
        )}
      </button>

      {node.expanded && node.children && (
        <div className="relative">
          {/* Tree guide line */}
          <div
            className="absolute top-0 bottom-0 w-[1px] bg-[var(--border-subtle)]"
            style={{ left: `${depth * 12 + 18}px` }}
          />
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onToggle={onToggle}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const workspacePath = useAppStore((s) => s.workspacePath);
  const openFile = useAppStore((s) => s.openFile);

  const loadDirectory = useCallback(async (dirPath: string): Promise<TreeNode[]> => {
    try {
      const { items } = await fsApi.readdir(dirPath);
      return items.map((item) => ({
        ...item,
        expanded: false,
        loading: false,
        children: item.isDirectory ? undefined : undefined,
      }));
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, []);

  useEffect(() => {
    if (!workspacePath) return;
    setError(null);
    loadDirectory(workspacePath).then(setTree);
  }, [workspacePath, loadDirectory]);

  const handleToggle = useCallback(
    async (path: string) => {
      const toggleNode = (nodes: TreeNode[]): TreeNode[] =>
        nodes.map((node) => {
          if (node.path === path) {
            if (node.expanded) return { ...node, expanded: false };
            return { ...node, expanded: true, loading: true };
          }
          if (node.children) return { ...node, children: toggleNode(node.children) };
          return node;
        });

      setTree((prev) => toggleNode(prev));

      const children = await loadDirectory(path);
      setTree((prev) => {
        const updateNode = (nodes: TreeNode[]): TreeNode[] =>
          nodes.map((node) => {
            if (node.path === path) return { ...node, children, loading: false };
            if (node.children) return { ...node, children: updateNode(node.children) };
            return node;
          });
        return updateNode(prev);
      });
    },
    [loadDirectory],
  );

  const handleFileClick = useCallback(
    async (entry: FsEntry) => {
      try {
        const { content, name } = await fsApi.read(entry.path);
        openFile({ path: entry.path, name, content });
      } catch (err: any) {
        setError(err.message);
      }
    },
    [openFile],
  );

  if (!workspacePath) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-center">
        <p className="text-xs text-[var(--text-muted)]">No workspace</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center h-9 px-3 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-subtle)] shrink-0">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
          <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
        </svg>
        Explorer
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-1.5 text-[10px] text-[var(--danger)] bg-[var(--danger)]/5 border-b border-[var(--danger)]/20 font-[var(--font-mono)]">
          {error}
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {tree.length === 0 && !error ? (
          <div className="px-3 py-3 text-[10px] text-[var(--text-muted)] font-[var(--font-mono)] animate-pulse">
            loading...
          </div>
        ) : (
          tree.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              depth={0}
              onToggle={handleToggle}
              onFileClick={handleFileClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
