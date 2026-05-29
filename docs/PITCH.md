# Terax Mobile - AI-Native Dev Workspace for Android

## The Idea

Take everything that makes Terax great on desktop (AI agent, terminal, code editor, file explorer, git, web preview) and make it run on Android phones via Termux - no Tauri, no native GUI, no root required. A Node.js server handles the backend, and the full React UI is served to the phone's browser.

**One command to install. Open browser. Start coding with AI.**

---

## The Problem

Developers on Android have limited options:
- **Termux alone** = powerful terminal, but no GUI editor, no AI agent, no integrated workflow
- **code-server** = VS Code in browser, but no built-in AI agent, heavy (~500MB+), slow on phones
- **Claude Code** = great AI, but CLI-only, no visual editor, no file explorer
- **Cursor AI AppImage** = crashes constantly in proot, needs `--no-sandbox --disable-gpu`, unusable UX

There's no lightweight, AI-native, integrated dev environment that works well on Android.

---

## The Solution: Terax Mobile

A web-based port of Terax that runs as a local server on Termux (or inside proot Ubuntu). Access the full IDE experience through your phone's browser.

```
Install: pkg install nodejs && npx terax-mobile
Open:    http://localhost:3000
Done.    Full AI-powered dev workspace in your browser.
```

---

## How It Works

```
+-----------------------------------------------------------+
|                    Android Phone                            |
+-----------------------------------------------------------+
|                                                           |
|  +------------------+          +----------------------+   |
|  | Phone Browser    |  HTTP/WS |  Terax Mobile Server |   |
|  | (Chrome/Firefox) | <------> |  (Node.js on Termux) |   |
|  |                  |          |                      |   |
|  | - React UI       |          | - PTY (node-pty)    |   |
|  | - xterm.js       |          | - File system (fs)  |   |
|  | - CodeMirror     |          | - Git (simple-git)  |   |
|  | - AI Chat        |          | - Shell (child_proc)|   |
|  | - File Explorer  |          | - AI SDK (Vercel)   |   |
|  +------------------+          | - WebSocket server  |   |
|                                +----------------------+   |
|                                                           |
+-----------------------------------------------------------+
```

### The Two Layers

**Backend (Node.js server running in Termux)**:
- Manages terminal sessions via `node-pty`
- Handles file read/write/search/grep operations
- Executes git commands
- Runs shell commands for the AI agent
- Proxies AI API calls (no CORS issues server-side)
- Streams terminal output via WebSocket
- Serves the frontend static files

**Frontend (React app in browser)**:
- Same xterm.js terminal (connects via WebSocket instead of Tauri IPC)
- Same CodeMirror 6 editor
- Same AI chat interface (Vercel AI SDK React hooks)
- Same file explorer, source control panel, themes
- Communicates with backend via WebSocket + REST API

---

## Core Components

### 1. Terminal System

| Aspect | How It Works |
|--------|-------------|
| PTY creation | `node-pty` spawns shell processes (bash/zsh in Termux) |
| Data streaming | WebSocket channel per terminal session |
| Multi-tab | Server maintains a Map of PTY sessions by ID |
| Resize | Client sends resize events via WebSocket |
| Split panes | Frontend-only (same xterm.js instances, multiple WS connections) |

```
Browser (xterm.js) <--WebSocket--> Server (node-pty) <--PTY--> bash/zsh
```

### 2. Code Editor

| Aspect | How It Works |
|--------|-------------|
| Rendering | CodeMirror 6 in browser (unchanged from Terax) |
| File loading | REST API: `GET /api/fs/read?path=/home/user/file.ts` |
| File saving | REST API: `POST /api/fs/write` with content body |
| Language support | Same CodeMirror language packs (client-side) |
| AI autocomplete | Same inline completion, routed through server AI proxy |

### 3. AI Agent System

| Aspect | How It Works |
|--------|-------------|
| Provider | Vercel AI SDK v6 (runs in Node.js - same as Terax frontend) |
| Models | Same BYOK: OpenAI, Anthropic, Google, Groq, local (Ollama) |
| Tools | Same tool definitions, but execute via Node.js fs/child_process |
| Approval flow | WebSocket event: server pauses, sends approval request to client |
| Streaming | Server-Sent Events (SSE) for AI response streaming |
| Key storage | Encrypted JSON file (`~/.terax-mobile/keys.enc`) with user passphrase |

**Tool execution flow:**
```
User prompt --> Server (AI SDK) --> Model returns tool call
    --> Tool needs approval? 
        Yes --> WS event to client --> User approves --> Execute
        No  --> Auto-execute
    --> Result back to model --> Continue or respond
```

### 4. File Explorer

| Aspect | How It Works |
|--------|-------------|
| Directory listing | REST: `GET /api/fs/readdir?path=/home/user/project` |
| File search | REST: `GET /api/fs/search?query=component&root=/project` |
| Grep | REST: `GET /api/fs/grep?pattern=TODO&path=/project` |
| Watch | WebSocket: server uses `chokidar` to watch, pushes changes to client |
| Create/Rename/Delete | REST: `POST /api/fs/create`, `POST /api/fs/rename`, etc. |

### 5. Git / Source Control

| Aspect | How It Works |
|--------|-------------|
| Status/Diff | `simple-git` library or shell-out to `git` CLI |
| Stage/Unstage | Same - `git add`, `git reset` via child_process |
| Commit/Push | Same |
| Log/Graph | Parse `git log --graph` output (same as Terax Rust parser) |
| Branch | `git branch`, `git checkout` |

### 6. Web Preview

| Aspect | How It Works |
|--------|-------------|
| Dev server detection | Server watches for localhost URLs in terminal output |
| Preview | Client opens an iframe pointing to the detected URL |
| Since both run on same device | `localhost:3000` (Terax) can iframe `localhost:5173` (Vite) |

---

## Tech Stack

### Backend

| Technology | Purpose | Why This Choice |
|-----------|---------|-----------------|
| **Node.js 20+** | Runtime | Available in Termux via `pkg install nodejs`, runs AI SDK natively |
| **Fastify** | HTTP server | Faster than Express, built-in WebSocket support, schema validation |
| **node-pty** | Terminal PTY | Battle-tested, used by VS Code/Hyper/Theia, works on ARM64 |
| **ws** | WebSocket | Lightweight, high-performance WebSocket for Node.js |
| **Vercel AI SDK v6** | AI integration | Same SDK as Terax desktop - direct port, all providers work |
| **simple-git** | Git operations | Clean API over git CLI, no native dependencies |
| **chokidar** | File watching | Cross-platform fs.watch wrapper, efficient on Linux |
| **zod** | Validation | API input validation (same as Terax) |

### Frontend

| Technology | Purpose | Why This Choice |
|-----------|---------|-----------------|
| **React 19** | UI framework | Same as Terax - components are directly portable |
| **xterm.js** | Terminal rendering | Same as Terax - WebGL renderer for performance |
| **CodeMirror 6** | Code editor | Same as Terax - all language modes, themes, vim |
| **Vercel AI SDK React** | AI chat UI | Same hooks (`useChat`, `useCompletion`) |
| **Tailwind v4** | Styling | Same as Terax |
| **Zustand** | State management | Same as Terax |
| **Vite** | Build tool | Same as Terax - builds the frontend static bundle |

### Communication Layer

| Protocol | Used For |
|----------|----------|
| **WebSocket** | Terminal I/O streaming, file watch events, AI approval flow, real-time updates |
| **REST (HTTP)** | File CRUD, git operations, settings, one-shot commands |
| **SSE** | AI response streaming (alternative to WS for AI specifically) |

### Deployment / Packaging

| Technology | Purpose |
|-----------|---------|
| **npm/pnpm** | Package distribution (`npx terax-mobile` to run) |
| **pkg** or **esbuild bundle** | Optional: single-binary distribution for Termux |
| **Termux pkg** | Could be packaged as a Termux package eventually |

---

## Installation Targets

### Option A: Direct on Termux (simplest)

```bash
pkg install nodejs git
npx terax-mobile
# Opens on http://localhost:3000
```

### Option B: Inside proot Ubuntu (if user already has it)

```bash
# Inside udroid Ubuntu:
apt install nodejs npm git
npx terax-mobile
```

### Option C: One-line installer script

```bash
curl -fsSL https://terax-mobile.dev/install.sh | bash
# Installs Node.js if missing, downloads terax-mobile, starts server
```

---

## What Gets Reused from Terax Desktop

| Component | Reuse Level | Notes |
|-----------|-------------|-------|
| React frontend components | ~80% | Replace `invoke()` calls with fetch/WebSocket |
| AI config (models, providers, pricing) | 100% | Direct copy |
| AI tools (tool definitions, schemas) | ~90% | Change execution layer from Rust to Node.js |
| AI system prompt | 100% | Direct copy |
| Theme engine | 100% | Pure CSS variables, no platform dependency |
| CodeMirror setup | 100% | Client-side only |
| xterm.js setup | ~95% | Change data source from Tauri Channel to WebSocket |
| UI components (shadcn) | 100% | Direct copy |
| File explorer UI | 100% | Just change data fetching layer |

---

## What's New / Different

| Aspect | Terax Desktop | Terax Mobile |
|--------|--------------|--------------|
| Runtime | Tauri + Rust binary | Node.js server |
| UI delivery | Embedded webview | Browser tab |
| IPC | Tauri invoke() | WebSocket + REST |
| PTY | portable-pty (Rust) | node-pty (Node.js) |
| Secret storage | OS keychain | Encrypted file + passphrase |
| SSRF protection | Rust IP classification | Node.js equivalent (same logic) |
| Auto-updater | Tauri plugin | npm update / git pull |
| Window controls | Native/custom titlebar | None (browser chrome) |
| Performance | Native binary speed | Node.js (slightly slower, still fast) |
| Install size | ~8 MB | ~50-80 MB (Node.js + deps) |

---

## Security Considerations

Since this runs as a local server on the phone:

1. **Bind to localhost only** - Server listens on `127.0.0.1:3000`, not `0.0.0.0`
2. **Auth token** - Generate a random token on startup, require it in all requests (prevents other apps from accessing)
3. **Same SSRF guards** - Port the IP classification logic from Terax's Rust `net.rs` to Node.js
4. **Encrypted key storage** - API keys encrypted at rest with a user passphrase
5. **Path authorization** - Same workspace registry concept (don't allow access outside project dirs)

---

## Project Structure

```
terax-mobile/
├── package.json
├── server/
│   ├── index.ts              # Entry point, starts Fastify server
│   ├── routes/
│   │   ├── fs.ts             # File system REST endpoints
│   │   ├── git.ts            # Git REST endpoints
│   │   ├── shell.ts          # Shell execution endpoints
│   │   └── ai.ts             # AI proxy + streaming endpoints
│   ├── services/
│   │   ├── pty.ts            # node-pty session management
│   │   ├── workspace.ts      # Path authorization registry
│   │   ├── secrets.ts        # Encrypted key storage
│   │   └── watcher.ts        # File system watcher (chokidar)
│   ├── ws/
│   │   ├── terminal.ts       # WebSocket handlers for PTY I/O
│   │   ├── events.ts         # File change events, AI approvals
│   │   └── index.ts          # WebSocket server setup
│   └── ai/
│       ├── agent.ts          # AI agent (same as Terax)
│       ├── tools.ts          # Tool definitions (Node.js execution)
│       ├── config.ts         # Models, providers (copied from Terax)
│       └── security.ts       # Path deny-list (copied from Terax)
├── client/                   # React frontend (built with Vite)
│   ├── src/
│   │   ├── app/App.tsx
│   │   ├── modules/          # Same module structure as Terax
│   │   │   ├── terminal/     # xterm.js + WebSocket bridge
│   │   │   ├── editor/       # CodeMirror (unchanged)
│   │   │   ├── ai/           # AI chat (fetch instead of invoke)
│   │   │   ├── explorer/     # File tree (REST data source)
│   │   │   ├── source-control/
│   │   │   ├── theme/        # Themes (unchanged)
│   │   │   └── ...
│   │   └── lib/
│   │       ├── api.ts        # REST client (replaces native.ts)
│   │       └── ws.ts         # WebSocket client (replaces Tauri channels)
│   └── vite.config.ts
├── scripts/
│   ├── install.sh            # One-line installer for Termux
│   └── start.sh              # Launch script
└── README.md
```

---

## MVP Scope (Phase 1)

For the first working version, focus on:

1. Terminal (node-pty + WebSocket + xterm.js) - the core experience
2. File explorer (read-only browsing + open in editor)
3. Code editor (CodeMirror, file read/write)
4. AI chat with one provider (OpenAI or Anthropic)
5. Basic AI tools: read_file, write_file, edit, run_command

**Skip for MVP**: Git integration, themes, web preview, sub-agents, voice input, multiple providers

---

## Why This Will Work

1. **node-pty works on Termux** - Proven by ttyd, code-server, and others
2. **Vercel AI SDK is pure JS** - No native dependencies, runs anywhere Node.js runs
3. **xterm.js in browser is fast** - WebGL renderer works in mobile Chrome
4. **CodeMirror is mobile-friendly** - Has touch support built in
5. **Termux has Node.js** - `pkg install nodejs` gives you Node 20+
6. **No root needed** - Everything runs in Termux's userspace
7. **80% code reuse** - The hard work (AI tools, UI components) is already done in Terax
