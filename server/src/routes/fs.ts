import type { FastifyInstance } from "fastify";
import {
  readdir,
  readFile,
  writeFile,
  stat,
  mkdir,
  rename,
  rm,
} from "node:fs/promises";
import { resolve, basename, extname } from "node:path";
import { workspaceGuard } from "../lib/security.js";

/**
 * File system routes: read, write, list, create, rename, delete.
 */
export async function fsRoutes(app: FastifyInstance) {
  // Read directory contents
  app.get<{
    Querystring: { path: string };
  }>("/readdir", async (request, reply) => {
    const { path } = request.query;
    if (!path) return reply.code(400).send({ error: "path required" });

    const check = workspaceGuard.validate(path);
    if (!check.ok) return reply.code(403).send({ error: check.error });

    try {
      const entries = await readdir(path, { withFileTypes: true });
      const items = entries.map((entry) => ({
        name: entry.name,
        path: resolve(path, entry.name),
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        isSymlink: entry.isSymbolicLink(),
      }));

      // Sort: directories first, then files, alphabetical within each group
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return { items };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // Read file content
  app.get<{
    Querystring: { path: string };
  }>("/read", async (request, reply) => {
    const { path } = request.query;
    if (!path) return reply.code(400).send({ error: "path required" });

    const check = workspaceGuard.validate(path);
    if (!check.ok) return reply.code(403).send({ error: check.error });

    try {
      const fileStat = await stat(path);
      // Refuse to read files larger than 5MB
      if (fileStat.size > 5 * 1024 * 1024) {
        return reply.code(413).send({ error: "File too large (max 5MB)" });
      }

      const content = await readFile(path, "utf-8");
      return {
        content,
        path,
        name: basename(path),
        extension: extname(path),
        size: fileStat.size,
      };
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return reply.code(404).send({ error: "File not found" });
      }
      return reply.code(500).send({ error: err.message });
    }
  });

  // Write file content
  app.post<{
    Body: { path: string; content: string };
  }>("/write", async (request, reply) => {
    const { path, content } = request.body;
    if (!path) return reply.code(400).send({ error: "path required" });

    const check = workspaceGuard.validate(path);
    if (!check.ok) return reply.code(403).send({ error: check.error });

    try {
      await writeFile(path, content, "utf-8");
      return { ok: true, path };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // Get file/directory stats
  app.get<{
    Querystring: { path: string };
  }>("/stat", async (request, reply) => {
    const { path } = request.query;
    if (!path) return reply.code(400).send({ error: "path required" });

    const check = workspaceGuard.validate(path);
    if (!check.ok) return reply.code(403).send({ error: check.error });

    try {
      const s = await stat(path);
      return {
        path,
        name: basename(path),
        size: s.size,
        isDirectory: s.isDirectory(),
        isFile: s.isFile(),
        modified: s.mtime.toISOString(),
        created: s.birthtime.toISOString(),
      };
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.code(500).send({ error: err.message });
    }
  });

  // Create file or directory
  app.post<{
    Body: { path: string; type: "file" | "directory"; content?: string };
  }>("/create", async (request, reply) => {
    const { path, type, content } = request.body;
    if (!path || !type) {
      return reply.code(400).send({ error: "path and type required" });
    }

    const check = workspaceGuard.validate(path);
    if (!check.ok) return reply.code(403).send({ error: check.error });

    try {
      if (type === "directory") {
        await mkdir(path, { recursive: true });
      } else {
        await writeFile(path, content || "", "utf-8");
      }
      return { ok: true, path };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // Rename file or directory
  app.post<{
    Body: { from: string; to: string };
  }>("/rename", async (request, reply) => {
    const { from, to } = request.body;
    if (!from || !to) {
      return reply.code(400).send({ error: "from and to required" });
    }

    const checkFrom = workspaceGuard.validate(from);
    if (!checkFrom.ok) return reply.code(403).send({ error: checkFrom.error });
    const checkTo = workspaceGuard.validate(to);
    if (!checkTo.ok) return reply.code(403).send({ error: checkTo.error });

    try {
      await rename(from, to);
      return { ok: true, from, to };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // Delete file or directory
  app.post<{
    Body: { path: string };
  }>("/delete", async (request, reply) => {
    const { path } = request.body;
    if (!path) return reply.code(400).send({ error: "path required" });

    const check = workspaceGuard.validate(path);
    if (!check.ok) return reply.code(403).send({ error: check.error });

    try {
      await rm(path, { recursive: true });
      return { ok: true, path };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
