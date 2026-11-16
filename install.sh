#!/usr/bin/env bash
# Installs claudegrid with npm, from a local clone when run inside one.
#   curl -fsSL https://raw.githubusercontent.com/halitsever/claudegrid/main/install.sh | bash
set -euo pipefail

repo="halitsever/claudegrid"
say() { printf '\033[38;5;209m▦\033[0m %s\n' "$*"; }
die() { printf '\033[31merror\033[0m: %s\n' "$*" >&2; exit 1; }

command -v node >/dev/null || die "node is not installed. claudegrid needs Node.js 20 or newer"
command -v npm >/dev/null || die "npm is not installed"
major=$(node -p 'process.versions.node.split(".")[0]')
[ "$major" -ge 20 ] || die "Node.js $(node -v) is too old, claudegrid needs 20 or newer"

# The first claudegrid was a bash script plus a Konsole profile. Both would shadow the new CLI.
legacy="$HOME/.local/bin/claudegrid"
if [ -f "$legacy" ] && grep -q 'CLAUDEGRID_DIR' "$legacy" 2>/dev/null; then
  rm -f "$legacy"
  profile="${XDG_DATA_HOME:-$HOME/.local/share}/konsole/claudegrid.profile"
  grep -q 'claudegrid --pane' "$profile" 2>/dev/null && rm -f "$profile"
  say "removed the old bash version of claudegrid"
fi

script_dir=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

if [ -n "$script_dir" ] && grep -q '"name": "claudegrid"' "$script_dir/package.json" 2>/dev/null; then
  say "building from $script_dir"
  (cd "$script_dir" && npm install --silent --no-audit --no-fund && npm pack --silent --pack-destination "$tmp" >/dev/null)
  set -- "$tmp"/claudegrid-*.tgz
  source=$1
elif npm view claudegrid version >/dev/null 2>&1; then
  source="claudegrid"
else
  source="https://github.com/$repo/releases/latest/download/claudegrid.tgz"
fi

# Fall back to ~/.local when the global npm prefix needs root.
prefix_args=()
if [ ! -w "$(npm prefix -g)" ]; then
  prefix_args=(--prefix "$HOME/.local")
  say "global npm folder is not writable, installing into ~/.local"
fi

say "installing $source"
# macOS ships bash 3.2, where "${arr[@]}" of an empty array trips set -u.
npm install -g --silent --no-audit --no-fund ${prefix_args[@]+"${prefix_args[@]}"} "$source"

if ! command -v claudegrid >/dev/null; then
  say "installed, but claudegrid is not on your PATH yet. Add this to your shell config:"
  # shellcheck disable=SC2016
  printf '    export PATH="%s/bin:$PATH"\n' "${prefix_args[1]:-$(npm prefix -g)}"
  exit 0
fi

say "installed claudegrid $(claudegrid --version)"
cat <<'NEXT'

  claudegrid doctor              check that everything works
  claudegrid                     open 4 Claude Code panes here
  claudegrid init                create a .claudegrid.json for this project

  shell completion (pick yours):
    claudegrid completion bash > ~/.local/share/bash-completion/completions/claudegrid
    claudegrid completion zsh  > "${fpath[1]}/_claudegrid"
    claudegrid completion fish > ~/.config/fish/completions/claudegrid.fish
NEXT
