# PocketDevOS - Project Plan

## Overview

PocketDevOS is an AI-native development workspace that runs on Android via Termux. A Node.js backend serves a React frontend to the phone's browser, giving developers a full IDE experience (terminal, editor, AI agent, file explorer, git) from their pocket.

---

## Phase 1: Foundation (Week 1-2)

**Goal**: Get a working terminal + file viewer in the browser on Termux.

### Tasks

#### 1.1 Project Scaffolding
- [ ] Initialize monorepo structure (`server/` + `client/`)
- [ ] Set up `package.json` with workspace config (pnpm workspaces)
- [ ] Configure TypeScript for both server and client
- [ ] Set up Vite for client build
- [ ] Set up `tsup` or `tsx` for server build/dev
- [ ] Create `.gitignore`, `README.md`, `LICENSE`

#### 1.2 Server Core
- [ ] Fastify server with CORS + static file serving
- [ ] Auth token generation on startup (random 32-byte hex)
- [ ] Auth middleware (validate token in header/query for all routes)
- [ ] Bind to `127.0.0.1:3000` only
- [ ] Graceful shutdown handler (kill PTY sessions on exit)
- [ ] Environment detection (Termux vs Ubuntu vs generic Linux)

#### 1.3 Terminal Backend
- [ ] `node-pty` integration: spawn shell sessions
- [ ] Session manager: Map<id, PtyProcess> with create/write/resize/kill
- [ ] WebSocket server (`ws` library) on `/ws/terminal/:id`
- [ ] Shell detection: `$SHELL` or fallback to bash/zsh
- [ ] Terminal output streaming (PTY stdout -> WebSocket -> client)
- [ ] Terminal input handling (WebSocket -> PTY stdin)
- [ ] Resize events (client sends cols/rows -> PTY resize)
- [ ] Session cleanup on disconnect

#### 1.4 Terminal Frontend
- [ ] xterm.js setup with WebGL renderer
- [ ] WebSocket connection to server terminal endpoint
- [ ] Fit addon (auto-resize terminal to container)
- [ ] Search addon
- [ ] Web links addon
- [ ] Multi-tab UI (create/close/switch tabs)
- [ ] Basic responsive layout for mobile screens

#### 1.5 File System API (Read-Only)
- [ ] `GET /api/fs/readdir` - List directory contents
- [ ] `GET /api/fs/read` - Read file content (text + binary detection)
- [ ] `GET /api/fs/stat` - File metadata (size, modified, type)
- [ ] Path authorization: restrict to workspace root + home
- [ ] Sensitive path deny-list (`.env`, `.ssh/`, etc.)

#### 1.6 Basic File Explorer UI
- [ ] Tree view component (collapsible directories)
- [ ] File icons (simplified icon set)
- [ ] Click to open file in read-only viewer
- [ ] Breadcrumb showing current path

### Deliverable
A working app where you run `node server/index.ts` in Termux, open `localhost:3000` in Chrome, and get a multi-tab terminal + file browser.

---

## Phase 2: Code Editor (Week 3-4)

**Goal**: Full read/write code editor with language support.

### Tasks

#### 2.1 File System API (Write)
- [ ] `POST /api/fs/write` - Write file content
- [ ] `POST /api/fs/create` - Create file or directory
- [ ] `POST /api/fs/rename` - Rename/move file
- [ ] `POST /api/fs/delete` - Delete file/directory
- [ ] File watcher service (`chokidar`) - watch open file directories
- [ ] WebSocket event channel for file change notifications

#### 2.2 Editor Component
- [ ] CodeMirror 6 integration
- [ ] Language modes: JavaScript/TypeScript, Python, Rust, Go, HTML/CSS, JSON, Markdown, Bash
- [ ] Editor themes: 3-4 built-in (dark default, light, nord, tokyo-night)
- [ ] Tab bar for open files (open/close/switch/dirty indicator)
- [ ] Save: Ctrl+S / Cmd+S sends content to server
- [ ] Unsaved changes warning on close
- [ ] File reload when external change detected (via watcher)

#### 2.3 Editor Features
- [ ] Syntax highlighting (via CodeMirror language packs)
- [ ] Line numbers, bracket matching, auto-indent
- [ ] Search and replace (Ctrl+F)
- [ ] Minimap (optional, may skip for mobile)
- [ ] Word wrap toggle
- [ ] Font size adjustment (important for mobile)

#### 2.4 Layout System
- [ ] Resizable panels (sidebar | editor/terminal)
- [ ] Panel toggle (hide/show sidebar, hide/show terminal)
- [ ] Mobile-friendly: swipe or button to switch between panels
- [ ] Persistent layout state (localStorage)

### Deliverable
Open files from explorer, edit them in CodeMirror, save back to disk. Terminal still works below/beside the editor.

---

## Phase 3: AI Agent (Week 5-7)

**Goal**: Working AI chat with tool execution (the core differentiator).

### Tasks

#### 3.1 Secret Storage
- [ ] Encrypted JSON file at `~/.pocketdevos/keys.json`
- [ ] Encrypt/decrypt with user passphrase (AES-256-GCM via Node.js crypto)
- [ ] First-run: prompt user to set passphrase
- [ ] API: `GET /api/secrets/list`, `POST /api/secrets/set`, `DELETE /api/secrets/delete`
- [ ] Settings UI for managing API keys per provider

#### 3.2 AI Provider Integration
- [ ] Vercel AI SDK setup (server-side)
- [ ] Provider factory: create provider instance from key + provider ID
- [ ] Support: OpenAI, Anthropic, Google, Groq, DeepSeek
- [ ] Local model support: Ollama (important for Termux users running Ollama locally)
- [ ] Model selection UI (dropdown with model list from config)
- [ ] SSE streaming endpoint: `POST /api/ai/chat` -> streams response

#### 3.3 AI Tools (Server-Side Execution)
- [ ] Tool framework: define tools with zod schemas + execute functions
- [ ] `read_file` - Read file content (with path security check)
- [ ] `write_file` - Write/create file (needs approval)
- [ ] `edit` - String replacement in file (needs approval, requires prior read)
- [ ] `list_directory` - List dir contents
- [ ] `grep` - Search file contents
- [ ] `glob` - Find files by pattern
- [ ] `run_command` - Execute shell command (needs approval, timeout, output cap)
- [ ] Approval flow: tool pauses -> WS event to client -> user approves/rejects -> continue

#### 3.4 AI Chat UI
- [ ] Chat panel (collapsible side panel or bottom sheet on mobile)
- [ ] Message list: user messages, assistant messages, tool calls, tool results
- [ ] Input bar: text input, send button, stop button
- [ ] Streaming display (tokens appear as they arrive)
- [ ] Tool approval cards (show what the AI wants to do, approve/reject buttons)
- [ ] Code blocks with syntax highlighting in messages
- [ ] Session management: new chat, switch sessions, delete sessions

#### 3.5 AI Context
- [ ] System prompt (adapted from Terax - workspace root, cwd, active file)
- [ ] Inject environment context into each message
- [ ] Terminal output tool: read last N lines from active terminal
- [ ] Auto-compact: summarize old messages when context gets long

### Deliverable
Chat with AI, it can read/write files, run commands (with your approval), and help you code. The core "agentic" experience works.

---

## Phase 4: Git & Source Control (Week 8-9)

**Goal**: Visual git workflow without leaving the app.

### Tasks

#### 4.1 Git Backend
- [ ] `GET /api/git/status` - Modified/staged/untracked files
- [ ] `GET /api/git/diff` - Diff for a file (staged or unstaged)
- [ ] `POST /api/git/stage` - Stage file(s)
- [ ] `POST /api/git/unstage` - Unstage file(s)
- [ ] `POST /api/git/discard` - Discard changes to file
- [ ] `POST /api/git/commit` - Commit with message
- [ ] `POST /api/git/push` - Push to remote
- [ ] `GET /api/git/log` - Commit history
- [ ] `GET /api/git/branches` - List branches
- [ ] Repo detection: find `.git` from workspace root

#### 4.2 Source Control UI
- [ ] Source control panel in sidebar
- [ ] Changed files list with status indicators (M/A/D/U)
- [ ] Click file to see diff
- [ ] Stage/unstage buttons per file
- [ ] Commit message input + commit button
- [ ] Push button with upstream status
- [ ] Branch indicator in status bar

#### 4.3 Diff Viewer
- [ ] Side-by-side or inline diff view (CodeMirror merge extension)
- [ ] AI-generated diffs open in diff viewer for review

### Deliverable
Full git workflow: see changes, stage, commit, push - all from the UI.

---

## Phase 5: Polish & Mobile UX (Week 10-11)

**Goal**: Make it feel good on a phone screen.

### Tasks

#### 5.1 Mobile Optimizations
- [ ] Touch-friendly UI (larger tap targets, swipe gestures)
- [ ] Bottom navigation bar for mobile (Terminal / Editor / AI / Files)
- [ ] Virtual keyboard handling (resize terminal/editor when keyboard opens)
- [ ] Landscape mode optimization
- [ ] PWA manifest (installable as "app" from browser)
- [ ] Service worker for offline UI shell

#### 5.2 Theme Engine
- [ ] CSS variable-based theming (port from Terax)
- [ ] 5 built-in themes: default dark, light, nord, catppuccin, tokyo-night
- [ ] Theme switcher in settings
- [ ] Editor theme independent from app theme

#### 5.3 Settings & Preferences
- [ ] Settings page: AI providers, keys, default model
- [ ] Editor settings: font size, tab size, word wrap, vim mode
- [ ] Terminal settings: font size, scrollback lines
- [ ] Persist all settings to `~/.pocketdevos/settings.json`

#### 5.4 Keyboard Shortcuts
- [ ] Shortcut system (Ctrl+` for terminal, Ctrl+P for file search, etc.)
- [ ] Shortcut help dialog
- [ ] Customizable shortcuts (stored in settings)

#### 5.5 Status Bar
- [ ] Current file path
- [ ] Git branch
- [ ] AI status (idle/thinking/error)
- [ ] Connection status (WebSocket health)

### Deliverable
A polished, mobile-friendly experience that feels like a native app.

---

## Phase 6: Distribution & Installer (Week 12)

**Goal**: One-command install on Termux.

### Tasks

#### 6.1 Packaging
- [ ] Bundle server with `esbuild` (single JS file, fast startup)
- [ ] Build client with Vite (static files served by server)
- [ ] npm package: `pocketdevos` (installable via `npm i -g pocketdevos`)
- [ ] Binary wrapper: `pocketdevos` command starts the server

#### 6.2 Installer Script
- [ ] `install.sh` for Termux: installs Node.js if missing, installs pocketdevos
- [ ] Auto-detect environment (Termux native vs proot Ubuntu)
- [ ] Install `node-pty` build dependencies if needed (`pkg install build-essential python`)
- [ ] Post-install: print URL + auth token

#### 6.3 Launch Script
- [ ] `pocketdevos` command: starts server, prints URL, optionally opens browser
- [ ] `pocketdevos --port 8080` - custom port
- [ ] `pocketdevos --open` - auto-open in default browser (via `termux-open-url`)
- [ ] `pocketdevos --workspace /path` - set workspace root

#### 6.4 Documentation
- [ ] README with screenshots
- [ ] Installation guide (Termux, proot Ubuntu, generic Linux)
- [ ] AI setup guide (how to add API keys)
- [ ] Troubleshooting (common Termux issues)

### Deliverable
Users can install with one command and start coding immediately.

---

## Phase 7: Advanced Features (Post-Launch)

**Goal**: Feature parity with Terax desktop where possible.

### Tasks (prioritized backlog)

- [ ] AI sub-agents (delegate tasks to specialized agents)
- [ ] AI plan mode (multi-step planning before execution)
- [ ] Background processes (dev server management, `bash_background` equivalent)
- [ ] Web preview (iframe for localhost dev servers)
- [ ] File search (fuzzy finder like Ctrl+P)
- [ ] AI inline autocomplete in editor
- [ ] Voice input (Web Speech API)
- [ ] Multiple AI sessions
- [ ] Custom agents (user-defined system prompts + tool subsets)
- [ ] Snippets / slash commands
- [ ] Split terminal panes
- [ ] Git commit graph visualization
- [ ] Vim mode in editor
- [ ] Project memory (`POCKETDEVOS.md` file)
- [ ] Collaborative editing (future - WebRTC)

---

## Timeline Summary

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1: Foundation | Week 1-2 | Terminal + file browser working |
| Phase 2: Editor | Week 3-4 | Full code editor with save |
| Phase 3: AI Agent | Week 5-7 | AI chat with tool execution |
| Phase 4: Git | Week 8-9 | Source control workflow |
| Phase 5: Polish | Week 10-11 | Mobile UX + themes + settings |
| Phase 6: Distribution | Week 12 | One-command install |
| Phase 7: Advanced | Ongoing | Feature parity backlog |

**MVP (usable product)**: End of Phase 3 (~7 weeks). Terminal + Editor + AI Agent is the core value proposition.

---

## Technical Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Server framework | Fastify | Faster than Express, native WS support, TypeScript-first |
| PTY library | node-pty | Industry standard (VS Code uses it), works on ARM64 |
| WebSocket | ws | Lightweight, no bloat, high performance |
| Frontend framework | React 19 | Same as Terax, maximum code reuse |
| Build tool | Vite | Same as Terax, fast HMR in dev |
| State management | Zustand | Same as Terax, simple and fast |
| AI SDK | Vercel AI SDK v6 | Same as Terax, all providers, streaming, tools |
| Styling | Tailwind v4 | Same as Terax, utility-first |
| Package manager | pnpm | Fast, disk-efficient, workspace support |
| Language | TypeScript | Both server and client, shared types |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| node-pty fails to compile on Termux | Fallback: use `child_process.spawn` with raw PTY via `/dev/ptmx` |
| WebGL not available in mobile browser | xterm.js falls back to canvas renderer automatically |
| Large bundle size for mobile | Tree-shake aggressively, lazy-load editor language packs |
| Phone battery drain | Idle detection: pause file watchers when tab not visible |
| WebSocket disconnects on mobile | Auto-reconnect with exponential backoff, session persistence |
| node-pty ARM64 build issues | Pre-build native addon, or use `@aspect-build/rules_js` prebuild |

---

## Success Metrics

- [ ] Install to first terminal session: under 3 minutes
- [ ] Server startup time: under 2 seconds
- [ ] Terminal input latency: under 50ms
- [ ] AI first-token latency: same as provider (no added overhead)
- [ ] Memory usage: under 150MB idle
- [ ] Works on Android 11+ with 4GB RAM
