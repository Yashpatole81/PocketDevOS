import { resolve, normalize } from "node:path";
import { homedir } from "node:os";

/**
 * Paths that should never be read or written by the AI agent or file APIs.
 * Same concept as Terax's security.ts deny-list.
 */
const DENIED_PATTERNS: RegExp[] = [
  /\.env($|\.)/,           // .env, .env.local, .env.production
  /\.ssh\//,               // SSH keys
  /\.gnupg\//,             // GPG keys
  /\.aws\/credentials/,    // AWS credentials
  /\.npmrc$/,              // npm tokens
  /\.netrc$/,              // netrc credentials
  /id_rsa/,                // SSH private keys
  /id_ed25519/,            // SSH private keys
  /\.pocketdevos\/keys/,   // Our own encrypted keys
  /\/etc\/shadow/,         // System passwords
  /\/etc\/passwd/,         // User list
];

/**
 * Check if a path is denied (sensitive file).
 */
export function isDeniedPath(path: string): boolean {
  const normalized = normalize(path).replace(/\\/g, "/");
  return DENIED_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Workspace root authorization.
 * Ensures paths don't escape the authorized workspace.
 */
export class WorkspaceGuard {
  private roots: Set<string> = new Set();

  constructor() {
    // Always authorize home directory
    const home = homedir();
    if (home) this.roots.add(normalize(home));
  }

  authorize(path: string): void {
    this.roots.add(normalize(resolve(path)));
  }

  isAuthorized(targetPath: string): boolean {
    const resolved = normalize(resolve(targetPath));
    for (const root of this.roots) {
      if (resolved.startsWith(root)) return true;
    }
    return false;
  }

  /**
   * Validate a path: must be authorized AND not denied.
   */
  validate(path: string): { ok: boolean; error?: string } {
    if (isDeniedPath(path)) {
      return { ok: false, error: `Access denied: sensitive path` };
    }
    if (!this.isAuthorized(path)) {
      return { ok: false, error: `Access denied: outside workspace` };
    }
    return { ok: true };
  }
}

export const workspaceGuard = new WorkspaceGuard();
