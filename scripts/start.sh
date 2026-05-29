#!/bin/bash
# Start PocketDevOS
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check if built
if [ -d "client/dist" ]; then
  # Production mode
  exec node dist/server/index.js "$@"
else
  # Dev mode (uses tsx for TypeScript)
  exec npx tsx server/src/index.ts "$@"
fi
