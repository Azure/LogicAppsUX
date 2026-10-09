#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
temp_root="$(mktemp -d)"
trap 'rm -rf "$temp_root"' EXIT

real_root="$temp_root/real-dotnet-root"
symlink_bin="$temp_root/symlink-bin"
real_dotnet="$real_root/dotnet"
symlinked_dotnet="$symlink_bin/dotnet"

mkdir -p "$real_root" "$symlink_bin"
printf '#!/usr/bin/env bash\nexit 0\n' > "$real_dotnet"
chmod +x "$real_dotnet"
ln -s "$real_dotnet" "$symlinked_dotnet"
if [[ ! -L "$symlinked_dotnet" ]]; then
  echo 'ERROR: this regression test requires a platform that supports POSIX file symlinks.' >&2
  exit 1
fi

export PATH="$symlink_bin:$PATH"
hash -r

discovered_binary="$(command -v dotnet)"
before_root="$(dirname -- "$discovered_binary")"
after_root="$(bash "$repo_root/scripts/resolve-dotnet-root.sh")"

echo "BEFORE: dirname(command -v dotnet) = $before_root"
echo "EXPECTED REAL ROOT:              $real_root"
echo "AFTER: resolved dotnet root     = $after_root"

[[ "$discovered_binary" == "$symlinked_dotnet" ]]
[[ "$before_root" == "$symlink_bin" ]]
[[ "$before_root" != "$real_root" ]]
[[ "$after_root" == "$real_root" ]]

echo 'PASS: the legacy expression returns the symlink directory and the resolver returns the real dotnet root.'
