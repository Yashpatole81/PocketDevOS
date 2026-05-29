# PocketDevOS

AI-native development workspace for Android. Runs on Termux, accessed via browser.

## What is this?

A full dev environment (terminal, code editor, AI agent, file explorer, git) that runs as a Node.js server on your Android phone via Termux. Open `localhost:3000` in your browser and start coding.

## Quick Start (Termux)

```bash
curl -fsSL https://raw.githubusercontent.com/user/PocketDevOS/main/scripts/install.sh | bash
pocketdevos
```

## Quick Start (any Linux / macOS)

```bash
git clone https://github.com/user/PocketDevOS.git
cd PocketDevOS
npm install
npm run build
npm start
```

Open `http://localhost:3000` in your browser.

## Development

```bash
npm install
npm run dev
```

This starts both the server (tsx watch) and client (vite dev server) concurrently.

## Project Structure

```
PocketDevOS/
├── server/           # Node.js backend (Fastify + node-pty)
│   └── src/
│       ├── index.ts          # Server entry point
│       ├── routes/
│       │   ├── terminal.ts   # PTY session management + WebSocket
│       │   ├── fs.ts         # File system CRUD
│       │   ├── shell.ts      # One-shot command execution
│       │   └── ai.ts         # AI chat routes
│       ├── ai/
│       │   ├── agent.ts      # AI agent logic
│       │   ├── config.ts     # AI provider config
│       │   └── tools.ts      # AI tool definitions
│       └── lib/
│           ├── auth.ts       # Token-based auth
│           └── security.ts   # Path deny-list + workspace guard
├── client/           # React frontend (Vite + xterm.js)
│   └── src/
│       ├── main.tsx
│       ├── app/App.tsx       # Root component with tab management
│       ├── modules/
│       │   ├── terminal/     # xterm.js + WebSocket terminal
│       │   ├── editor/       # CodeMirror 6 editor
│       │   ├── explorer/     # File tree explorer
│       │   ├── ai/           # AI chat panel
│       │   ├── settings/     # Settings page
│       │   └── theme/        # Theme provider
│       ├── store/            # Zustand stores
│       ├── lib/
│       │   ├── api.ts        # REST/WS client
│       │   └── utils.ts
│       └── styles/
│           └── globals.css
├── bin/
│   └── pocketdevos.js        # npm bin entry point
├── scripts/
│   ├── install.sh            # One-line Termux installer
│   └── start.sh              # Launch script
├── docs/
│   ├── PITCH.md              # Project vision
│   └── PLAN.md               # Development roadmap
├── package.json              # Single package (all deps)
└── tsconfig.json             # Project references root
```

## Tech Stack

**Backend**: Node.js, Fastify, node-pty, ws, chokidar  
**Frontend**: React 19, xterm.js, CodeMirror 6, Tailwind v4, Zustand  
**AI**: Vercel AI SDK with OpenAI-compatible providers  
**Build**: Vite, tsup, TypeScript

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (server + client concurrently) |
| `npm run build` | Build client (Vite) + server (tsup) for production |
| `npm start` | Run production server |
| `npm run typecheck` | TypeScript type checking |

## License

Apache-2.0
