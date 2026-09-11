#!/usr/bin/env bash
set -euo pipefail

dotnet_binary="$(command -v dotnet)"
canonical_dotnet_binary="$(readlink -f -- "$dotnet_binary")"
dirname -- "$canonical_dotnet_binary"
