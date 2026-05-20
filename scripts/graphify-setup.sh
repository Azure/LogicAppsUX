#!/usr/bin/env bash
# scripts/graphify-setup.sh
#
# One-time setup for Graphify knowledge graph tooling.
# Installs the graphify CLI and configures the AI assistant hook.
#
# Usage:
#   pnpm run graphify:setup         # install CLI + Copilot hook
#   ./scripts/graphify-setup.sh     # same thing
#
# Requires Python 3.10+ (checks homebrew, system, and PATH)

set -euo pipefail

echo "Setting up Graphify knowledge graph tooling..."
echo ""

# --- Find Python 3.10+ ---
PYTHON=""
for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$candidate" &>/dev/null; then
    version=$("$candidate" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
    major=$(echo "$version" | cut -d. -f1)
    minor=$(echo "$version" | cut -d. -f2)
    if [ "$major" -gt 3 ] || { [ "$major" -eq 3 ] && [ "$minor" -ge 10 ]; }; then
      PYTHON="$candidate"
      break
    fi
  fi
done

# Also check homebrew paths
if [ -z "$PYTHON" ]; then
  for candidate in /opt/homebrew/bin/python3.13 /opt/homebrew/bin/python3.12 /opt/homebrew/bin/python3.11 /opt/homebrew/bin/python3.10 /usr/local/bin/python3.13 /usr/local/bin/python3.12 /usr/local/bin/python3.11 /usr/local/bin/python3.10; do
    if [ -x "$candidate" ]; then
      PYTHON="$candidate"
      break
    fi
  done
fi

if [ -z "$PYTHON" ]; then
  echo "Error: Python 3.10+ not found."
  echo "Install with: brew install python@3.13"
  exit 1
fi

echo "Using Python: $PYTHON ($($PYTHON --version))"

# --- Install pipx if needed ---
# Ensure PATH includes pipx/local bin dir early so pipx is usable after install
export PATH="$HOME/.local/bin:$PATH"

if ! command -v pipx &>/dev/null; then
  echo "Installing pipx..."
  if command -v brew &>/dev/null; then
    brew install pipx 2>&1 | tail -2
    pipx ensurepath 2>/dev/null || true
  else
    "$PYTHON" -m pip install --user pipx 2>&1 | tail -2
  fi
  export PATH="$HOME/.local/bin:$PATH"
fi

# --- Install graphify ---
if command -v graphify &>/dev/null || [ -x "$HOME/.local/bin/graphify" ]; then
  echo "Graphify already installed."
else
  echo "Installing graphify..."
  pipx install graphifyy --python "$PYTHON" 2>&1 | tail -3
fi

# Ensure PATH includes pipx bin
export PATH="$HOME/.local/bin:$PATH"

# --- Install Copilot CLI hook ---
echo ""
echo "Installing Copilot CLI skill..."
graphify copilot install 2>&1

# --- Done ---
echo ""
echo "Setup complete. Available commands:"
echo "  pnpm run graphify:rebuild              # rebuild all knowledge graphs"
echo "  pnpm run graphify:rebuild -- designer-v2  # rebuild specific lib"
echo "  graphify query \"...\" --graph libs/designer-v2/src/graphify-out/graph.json"
echo "  graphify path \"A\" \"B\" --graph libs/designer-v2/src/graphify-out/graph.json"
echo "  graphify explain \"X\" --graph libs/designer-v2/src/graphify-out/graph.json"
