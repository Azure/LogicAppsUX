#!/usr/bin/env bash
set -euo pipefail

# Generate tool-native AI instruction files from the canonical source in docs/ai-setup/.
# Usage: ./scripts/generate-ai-docs.sh   (or: pnpm run ai:generate)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="$REPO_ROOT/docs/ai-setup"
PACKAGES_DIR="$SOURCE_DIR/packages"

count=0

# Strip single-line HTML comments (source header comments) from stdin.
strip_header_comments() {
  grep -v '^\s*<!--.*-->\s*$'
}

# --- 1. Root CLAUDE.md ---
{
  echo '<!-- AUTO-GENERATED from docs/ai-setup/. DO NOT EDIT directly. Run: pnpm run ai:generate -->'
  echo ''
  echo '# CLAUDE.md'
  echo ''
  echo 'This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.'
  echo ''
  strip_header_comments < "$SOURCE_DIR/shared.md"
} > "$REPO_ROOT/CLAUDE.md"
count=$((count + 1))

# --- 2. .github/copilot-instructions.md ---
mkdir -p "$REPO_ROOT/.github"
{
  echo '<!-- AUTO-GENERATED from docs/ai-setup/. DO NOT EDIT directly. Run: pnpm run ai:generate -->'
  echo ''
  strip_header_comments < "$SOURCE_DIR/shared.md"
} > "$REPO_ROOT/.github/copilot-instructions.md"
count=$((count + 1))

# --- 3. .github/instructions/*.instructions.md ---
mkdir -p "$REPO_ROOT/.github/instructions"

for src in "$PACKAGES_DIR"/*.md; do
  name="$(basename "$src" .md)"
  {
    echo "<!-- AUTO-GENERATED from docs/ai-setup/packages/${name}.md. DO NOT EDIT directly. -->"
    echo ''
    strip_header_comments < "$src"
  } > "$REPO_ROOT/.github/instructions/${name}.instructions.md"
  count=$((count + 1))
done

# --- 4. Per-package CLAUDE.md files ---
# Map of package-name -> target directory (one entry per line: "name|dir")
PACKAGE_MAP=(
  "designer-v2|libs/designer-v2"
  "designer|libs/designer"
  "designer-ui|libs/designer-ui"
  "logic-apps-shared|libs/logic-apps-shared"
  "data-mapper-v2|libs/data-mapper-v2"
  "data-mapper|libs/data-mapper"
  "a2a-core|libs/a2a-core"
  "chatbot|libs/chatbot"
  "vscode-extension|libs/vscode-extension"
  "standalone|apps/Standalone"
  "vs-code-designer|apps/vs-code-designer"
  "vs-code-react|apps/vs-code-react"
  "docs-site|apps/docs"
  "iframe-app|apps/iframe-app"
)

for entry in "${PACKAGE_MAP[@]}"; do
  name="${entry%%|*}"
  dir="${entry##*|}"
  src="$PACKAGES_DIR/${name}.md"
  dest_dir="$REPO_ROOT/${dir}"

  if [[ ! -f "$src" ]]; then
    echo "warning: source not found: $src — skipping" >&2
    continue
  fi

  mkdir -p "$dest_dir"
  {
    echo "<!-- AUTO-GENERATED from docs/ai-setup/packages/${name}.md. DO NOT EDIT directly. -->"
    echo ''
    strip_header_comments < "$src"
  } > "$dest_dir/CLAUDE.md"
  count=$((count + 1))
done

echo "ai:generate — ${count} files generated."
