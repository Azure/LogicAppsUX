#!/usr/bin/env bash
# scripts/graphify-rebuild.sh
#
# Rebuilds Graphify knowledge graphs for all libs in the monorepo.
# Uses pure AST extraction (no LLM, no API cost, runs in seconds).
#
# Usage:
#   ./scripts/graphify-rebuild.sh          # rebuild all libs
#   ./scripts/graphify-rebuild.sh designer-v2  # rebuild specific lib
#
# Prerequisites:
#   pip install graphifyy   (or: pipx install graphifyy)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIBS_DIR="$REPO_ROOT/libs"

ALL_LIBS=(
  designer-v2
  designer
  designer-ui
  logic-apps-shared
  data-mapper-v2
  a2a-core
  chatbot
  vscode-extension
)

# Check graphify is installed
if ! command -v graphify &>/dev/null; then
  echo "Error: graphify not found. Install with: pipx install graphifyy"
  echo "Requires Python 3.10+"
  exit 1
fi

# Determine which libs to build (filter out '--' from pnpm passthrough)
if [ $# -gt 0 ]; then
  LIBS=()
  for arg in "$@"; do
    [ "$arg" != "--" ] && LIBS+=("$arg")
  done
  [ ${#LIBS[@]} -eq 0 ] && LIBS=("${ALL_LIBS[@]}")
else
  LIBS=("${ALL_LIBS[@]}")
fi

echo "Rebuilding Graphify knowledge graphs..."
echo ""

for lib in "${LIBS[@]}"; do
  lib_dir="$LIBS_DIR/$lib"
  if [ ! -d "$lib_dir/src" ]; then
    echo "  SKIP  $lib (no src/ directory)"
    continue
  fi

  cd "$lib_dir"
  output=$(graphify update src/ 2>&1)
  stats=$(echo "$output" | grep -oE '[0-9]+ nodes, [0-9]+ edges, [0-9]+ communities' || echo "no stats")
  printf "  %-22s %s\n" "$lib" "$stats"
  cd "$REPO_ROOT"
done

echo ""
echo "Done. Reports at libs/<lib>/src/graphify-out/GRAPH_REPORT.md"
echo "Interactive HTML: run 'graphify update src/' in any lib, then open graphify-out/graph.html"
