#!/usr/bin/env bash
# Builds claudegrid.deb from the npm tarball: build.sh <claudegrid.tgz> <version> [output dir]
set -euo pipefail

tarball=$(realpath "$1")
version=$2
out=$(realpath "${3:-.}")
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

root="$work/root"
lib="$root/usr/lib/claudegrid"
mkdir -p "$lib" "$root/usr/bin" "$root/DEBIAN"
tar -xzf "$tarball" -C "$lib" --strip-components=1
ln -s ../lib/claudegrid/dist/cli.js "$root/usr/bin/claudegrid"

cli=(node "$lib/dist/cli.js")
install -d "$root/usr/share/bash-completion/completions" "$root/usr/share/zsh/vendor-completions" "$root/usr/share/fish/vendor_completions.d"
"${cli[@]}" completion bash > "$root/usr/share/bash-completion/completions/claudegrid"
"${cli[@]}" completion zsh > "$root/usr/share/zsh/vendor-completions/_claudegrid"
"${cli[@]}" completion fish > "$root/usr/share/fish/vendor_completions.d/claudegrid.fish"

install -Dm644 "$lib/docs/public/logo.svg" "$root/usr/share/icons/hicolor/scalable/apps/claudegrid.svg"
install -d "$root/usr/share/applications"
cat > "$root/usr/share/applications/claudegrid.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=claudegrid
GenericName=Claude Code grid
Comment=Open a grid of Claude Code agents
Exec=claudegrid ui
Icon=claudegrid
Terminal=false
Categories=Development;Utility;
Keywords=claude;ai;agent;terminal;tmux;konsole;grid;
StartupWMClass=claudegrid
DESKTOP

install -d "$root/usr/share/doc/claudegrid"
cat > "$root/usr/share/doc/claudegrid/copyright" <<COPYRIGHT
Format: https://www.debian.org/doc/packaging-manuals/copyright-format/1.0/
Upstream-Name: claudegrid
Source: https://github.com/halitsever/claudegrid

Files: *
Copyright: 2026 Halit Sever
License: MIT
$(sed 's/^$/./; s/^/ /' "$lib/LICENSE")
COPYRIGHT

cat > "$root/DEBIAN/control" <<CONTROL
Package: claudegrid
Version: $version
Section: devel
Priority: optional
Architecture: all
Depends: nodejs (>= 20)
Recommends: tmux, git
Suggests: konsole, qdbus-qt6 | qt6-tools-dev-tools, kitty, wezterm
Installed-Size: $(du -sk "$root/usr" | cut -f1)
Maintainer: Halit Sever <halitsever@users.noreply.github.com>
Homepage: https://halitsever.github.io/claudegrid/
Description: run a grid of Claude Code agents in one command
 claudegrid opens 2 to 16 Claude Code sessions side by side in KDE Konsole,
 tmux, kitty or WezTerm, with a prompt, model and git worktree per pane.
 It also has a desktop app (claudegrid ui) to set up and launch grids
 without the terminal.
CONTROL

find "$root" -type d -exec chmod 755 {} +
chmod 755 "$lib/dist/cli.js"
dpkg-deb --root-owner-group --build "$root" "$out/claudegrid.deb" >/dev/null
echo "$out/claudegrid.deb"
