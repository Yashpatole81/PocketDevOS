import { z } from "zod";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { workspaceGuard } from "../lib/security.js";

const execFileAsync = promisify(execFile);
const MAX_OUTPUT_BYTES = 256 * 1024;
const COMMAND_TIMEOUT_MS = 30_000;

export interface ToolDef {
  name: string;
  description: string;
  parameters: z.ZodType<any>;
  needsApproval: boolean;
  execute: (args: any) => Promise<string>;
}

const readFileTool: ToolDef = {
  name: "read_file",
  description: "Read the contents of a file at the given path.",
  parameters: z.object({
    path: z.string().describe("Absolute path to the file to read"),
  }),
  needsApproval: false,
  async execute(args: any) {
    const { path } = args;
    const check = workspaceGuard.validate(path);
    if (!check.ok) return `Error: ${check.error}`;
    try {
      const s = await stat(path);
      if (s.size > 5 * 1024 * 1024) return "Error: File too large (max 5MB)";
      return await readFile(path, "utf-8");
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
};

const writeFileTool: ToolDef = {
  name: "write_file",
  description: "Write content to a file. Creates if it doesn't exist, overwrites if it does.",
  parameters: z.object({
    path: z.string().describe("Absolute path to the file to write"),
    content: z.string().describe("Content to write to the file"),
  }),
  needsApproval: true,
  async execute(args: any) {
    const { path, content } = args;
    const check = workspaceGuard.validate(path);
    if (!check.ok) return `Error: ${check.error}`;
    try {
      await writeFile(path, content, "utf-8");
      return `Successfully wrote ${content.length} bytes to ${path}`;
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
};

const editFileTool: ToolDef = {
  name: "edit_file",
  description: "Edit a file by replacing a specific string with a new string. The old string must match exactly once.",
  parameters: z.object({
    path: z.string().describe("Absolute path to the file to edit"),
    old_string: z.string().describe("The exact string to find and replace"),
    new_string: z.string().describe("The replacement string"),
  }),
  needsApproval: true,
  async execute(args: any) {
    const { path, old_string, new_string } = args;
    const check = workspaceGuard.validate(path);
    if (!check.ok) return `Error: ${check.error}`;
    try {
      const content = await readFile(path, "utf-8");
      const occurrences = content.split(old_string).length - 1;
      if (occurrences === 0) return "Error: old_string not found in file";
      if (occurrences > 1) return `Error: old_string found ${occurrences} times. Must be unique.`;
      const newContent = content.replace(old_string, new_string);
      await writeFile(path, newContent, "utf-8");
      return `Successfully edited ${path}`;
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
};

const listDirectoryTool: ToolDef = {
  name: "list_directory",
  description: "List the contents of a directory.",
  parameters: z.object({
    path: z.string().describe("Absolute path to the directory to list"),
  }),
  needsApproval: false,
  async execute(args: any) {
    const { path } = args;
    const check = workspaceGuard.validate(path);
    if (!check.ok) return `Error: ${check.error}`;
    try {
      const entries = await readdir(path, { withFileTypes: true });
      const lines = entries.map((e) => {
        const prefix = e.isDirectory() ? "📁 " : "📄 ";
        return `${prefix}${e.name}`;
      });
      return lines.join("\n") || "(empty directory)";
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  },
};

const runCommandTool: ToolDef = {
  name: "run_command",
  description: "Execute a shell command. 30s timeout, 256KB output cap.",
  parameters: z.object({
    command: z.string().describe("The shell command to execute"),
    cwd: z.string().optional().describe("Working directory for the command"),
  }),
  needsApproval: true,
  async execute(args: any) {
    const { command, cwd } = args;
    const shell = process.env.SHELL || "/bin/sh";
    try {
      const { stdout, stderr } = await execFileAsync(shell, ["-c", command], {
        cwd: cwd || process.env.HOME || "/",
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT_BYTES,
        env: { ...process.env, TERM: "dumb" },
      });
      let output = "";
      if (stdout) output += stdout;
      if (stderr) output += (output ? "\n" : "") + `[stderr] ${stderr}`;
      return output || "(no output)";
    } catch (err: any) {
      if (err.killed) return `Error: Command timed out after 30s\n${err.stdout || ""}`;
      let output = "";
      if (err.stdout) output += err.stdout;
      if (err.stderr) output += (output ? "\n" : "") + `[stderr] ${err.stderr}`;
      return output || `Error: ${err.message}`;
    }
  },
};

const grepTool: ToolDef = {
  name: "grep",
  description: "Search for a pattern in files within a directory.",
  parameters: z.object({
    pattern: z.string().describe("Text or regex pattern to search for"),
    path: z.string().describe("Directory path to search in"),
    include: z.string().optional().describe("File glob pattern (e.g. '*.ts')"),
  }),
  needsApproval: false,
  async execute(args: any) {
    const { pattern, path, include } = args;
    const check = workspaceGuard.validate(path);
    if (!check.ok) return `Error: ${check.error}`;
    try {
      const grepArgs = ["-rn", "--color=never"];
      if (include) grepArgs.push(`--include=${include}`);
      grepArgs.push(pattern, path);
      const { stdout } = await execFileAsync("grep", grepArgs, {
        timeout: 10_000,
        maxBuffer: MAX_OUTPUT_BYTES,
      });
      const lines = stdout.trim().split("\n");
      if (lines.length > 50) {
        return lines.slice(0, 50).join("\n") + `\n... (${lines.length - 50} more matches)`;
      }
      return stdout.trim() || "No matches found";
    } catch (err: any) {
      if (err.code === 1) return "No matches found";
      return `Error: ${err.message}`;
    }
  },
};

export const AI_TOOLS: ToolDef[] = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirectoryTool,
  runCommandTool,
  grepTool,
];

export function getTool(name: string): ToolDef | undefined {
  return AI_TOOLS.find((t) => t.name === name);
}
