---
title: Getting started
description: Install claudegrid on Linux with KDE Konsole and start four Claude Code sessions in a 2x2 split terminal.
---

# Getting started

claudegrid is a small Bash script that opens a new KDE Konsole window, splits it into four panes and starts [Claude Code](https://claude.com/claude-code) in each one.

## Requirements

- Linux with **KDE Konsole**
- **qdbus6** (ships with Qt 6 tools, e.g. `qt6-tools` or `qdbus-qt6`)
- **Claude Code**, with the `claude` command on your `PATH`

## Install

```sh
git clone https://github.com/halitsever/claudegrid.git
cd claudegrid
./install.sh
```

The installer:

1. checks that `konsole`, `qdbus6` and `claude` are available
2. copies `claudegrid` to `~/.local/bin` (set `BIN_DIR` to change it)
3. creates a `claudegrid` profile in `~/.local/share/konsole`

If `~/.local/bin` is not on your `PATH`, the installer tells you. Add this to your shell config:

```sh
export PATH="$HOME/.local/bin:$PATH"
```

## Uninstall

```sh
rm ~/.local/bin/claudegrid ~/.local/share/konsole/claudegrid.profile
```

Next: [Usage](./usage)
