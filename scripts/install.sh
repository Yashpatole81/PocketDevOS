#!/bin/bash
# PocketDevOS Installer for Termux
# Usage: curl -fsSL https://raw.githubusercontent.com/user/PocketDevOS/main/scripts/install.sh | bash

set -e

echo "╔══════════════════════════════════════╗"
echo "║     Installing PocketDevOS...        ║"
echo "╚══════════════════════════════════════╝"

# Check if running in Termux
if [ ! -d "/data/data/com.termux" ] && [ -z "$PREFIX" ]; then
  echo "[!] Warning: Not running in Termux. Continuing anyway..."
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
  echo "[*] Installing Node.js..."
  pkg install -y nodejs || apt install -y nodejs
fi

# Install git if not present
if ! command -v git &> /dev/null; then
  echo "[*] Installing git..."
  pkg install -y git || apt install -y git
fi

# Install build tools for node-pty (needs python and make)
echo "[*] Installing build dependencies for node-pty..."
pkg install -y python make build-essential 2>/dev/null || apt install -y python3 make gcc g++ 2>/dev/null || true

# Clone or update PocketDevOS
INSTALL_DIR="$HOME/.pocketdevos/app"
if [ -d "$INSTALL_DIR" ]; then
  echo "[*] Updating PocketDevOS..."
  cd "$INSTALL_DIR" && git pull
else
  echo "[*] Downloading PocketDevOS..."
  mkdir -p "$HOME/.pocketdevos"
  git clone --depth 1 https://github.com/user/PocketDevOS.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# Install dependencies
echo "[*] Installing dependencies..."
npm install --production=false

# Build client
echo "[*] Building frontend..."
npx vite build --config client/vite.config.ts

# Create launcher script
LAUNCHER="$PREFIX/bin/pocketdevos"
if [ -z "$PREFIX" ]; then
  LAUNCHER="$HOME/.local/bin/pocketdevos"
  mkdir -p "$HOME/.local/bin"
fi

cat > "$LAUNCHER" << 'LAUNCHER_EOF'
#!/bin/bash
INSTALL_DIR="$HOME/.pocketdevos/app"
cd "$INSTALL_DIR"
exec node --experimental-specifier-resolution=node server/src/index.ts "$@"
LAUNCHER_EOF

# For production, use the built version:
# exec node dist/server/index.js "$@"

chmod +x "$LAUNCHER"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     PocketDevOS installed!           ║"
echo "╠══════════════════════════════════════╣"
echo "║  Run: pocketdevos                    ║"
echo "║  Then open browser to localhost:3000 ║"
echo "╚══════════════════════════════════════╝"
