#!/usr/bin/env bash
# Installs claudegrid into ~/.local/bin and registers its Konsole profile.
set -euo pipefail

bin_dir="${BIN_DIR:-$HOME/.local/bin}"
profile_dir="${XDG_DATA_HOME:-$HOME/.local/share}/konsole"

for dep in konsole qdbus6 claude; do
  command -v "$dep" >/dev/null || { echo "missing dependency: $dep" >&2; exit 1; }
done

mkdir -p "$bin_dir" "$profile_dir"
install -m 755 "$(dirname "$0")/claudegrid" "$bin_dir/claudegrid"

cat > "$profile_dir/claudegrid.profile" <<PROFILE
[General]
Name=claudegrid
Command=$bin_dir/claudegrid --pane
PROFILE

echo "installed $bin_dir/claudegrid"
case ":$PATH:" in *":$bin_dir:"*) ;; *) echo "add $bin_dir to your PATH" >&2 ;; esac
