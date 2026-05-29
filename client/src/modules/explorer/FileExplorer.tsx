import { useState, useCallback, useEffect } from "react";
import { fs as fsApi, type FsEntry } from "@/lib/api";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/lib/utils";

interface TreeNode extends FsEntry {
  children?: TreeNode[];
  expanded?: boolean;
  loading?: boolean;
}

function getFileIcon(name: string, isDirectory: boolean): string {
  if (isDirectory) return "📁";

  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "🟦";
    case "js":
    case "jsx":
      return "🟨";
    case "json":
      return "📋";
    case "md":
      return "📝";
    case "css":
      return "🎨";
    case "html":
      return "🌐";
    case "py":
      return "🐍";
    case "sh":
    case "bash":
      return "⚙️";
    case "yaml":
    case "yml":
      return "📄";
    case "toml":
      return "📄";
    case "lock":
      return "🔒";
    case "gitignore":
      return "👁️";
    default:
      return "📄";
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
          "flex items-center w-full px-2 py-0.5 text-left text-sm",
          "hover:bg-[var(--bg-tertiary)] transition-colors",
          "text-[var(--text-primary)]",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.isDirectory && (
          <span className="mr-1 text-[10px] text-[var(--text-secondary)]">
            {node.expanded ? "▼" : "▶"}
          </span>
        )}
        <span className="mr-1.5 text-xs">{getFileIcon(node.name, node.isDirectory)}</span>
        <span className="truncate">{node.name}</span>
        {node.loading && (
          <span className="ml-auto text-[10px] text-[var(--text-secondary)]">…</span>
        )}
      </button>

      {node.expanded && node.children && (
        <div>
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

  // Load root directory
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

  // Load initial tree when workspace changes
  useEffect(() => {
    if (!workspacePath) return;
    setError(null);
    loadDirectory(workspacePath).then(setTree);
  }, [workspacePath, loadDirectory]);

  // Toggle directory expansion
  const handleToggle = useCallback(
    async (path: string) => {
      const toggleNode = (nodes: TreeNode[]): TreeNode[] =>
        nodes.map((node) => {
          if (node.path === path) {
            if (node.expanded) {
              // Collapse
              return { ...node, expanded: false };
            }
            // Expand - load children
            return { ...node, expanded: true, loading: true };
          }
          if (node.children) {
            return { ...node, children: toggleNode(node.children) };
          }
          return node;
        });

      setTree((prev) => toggleNode(prev));

      // Load children
      const children = await loadDirectory(path);
      setTree((prev) => {
        const updateNode = (nodes: TreeNode[]): TreeNode[] =>
          nodes.map((node) => {
            if (node.path === path) {
              return { ...node, children, loading: false };
            }
            if (node.children) {
              return { ...node, children: updateNode(node.children) };
            }
            return node;
          });
        return updateNode(prev);
      });
    },
    [loadDirectory],
  );

  // Handle file click - load content and open in editor
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
      <div className="flex items-center justify-center h-full p-4 text-center text-sm text-[var(--text-secondary)]">
        <p>No workspace open</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center h-8 px-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide border-b border-[var(--border)] shrink-0">
        Explorer
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 py-1 text-xs text-[var(--danger)] bg-[var(--danger)]/10">
          {error}
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 && !error ? (
          <div className="px-3 py-2 text-xs text-[var(--text-secondary)]">
            Loading...
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
