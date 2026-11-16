---
title: Terminals
description: How claudegrid builds Claude Code grids in KDE Konsole, tmux, kitty and WezTerm, and how it picks one automatically.
---

# Terminals

claudegrid has four backends. With `backend: "auto"`, the default, it picks:

1. the terminal you are running in (tmux first, since it can run inside the others)
2. otherwise the first one available out of Konsole, kitty, WezTerm and tmux

`claudegrid doctor` shows which backends work on your machine and which one `auto` would use.

| Backend | Opens | Exact grid | Needs |
| --- | --- | --- | --- |
| `konsole` | a new Konsole window | yes | `konsole`, `qdbus6`, a D-Bus session |
| `tmux` | a new session, or a new window when you are in tmux | yes | tmux 3.1+ |
| `kitty` | a new kitty window | kitty's grid layout | `kitty` |
| `wezterm` | a new window in the running WezTerm | yes | WezTerm running |

## How a pane starts

claudegrid writes a small launch file (mode 600) to `$XDG_RUNTIME_DIR/claudegrid-<uid>/`. It holds each pane's name, directory and command. Every pane runs `claudegrid pane`, which reads that file, prints a one-line header, changes into the pane's directory and starts `claude`. The files are removed after a day.

This means claudegrid never types commands into your shell, and prompts with quotes or newlines arrive exactly as written.

## Konsole

claudegrid starts `konsole --separate` with a temporary profile, then builds the grid over Konsole's D-Bus API:

1. split the first view left and right until there are enough columns
2. split each column top and bottom until it has its rows
3. resize every splitter so all panes are the same size

The temporary profile copies your default Konsole profile, so fonts and colors stay the same. Nothing is written to `~/.local/share/konsole`.

Every Konsole session knows its own number from `KONSOLE_DBUS_SESSION`, and claudegrid uses that to tell each pane which task it has.

## tmux

Outside tmux, claudegrid creates a session called `claudegrid-<name>` and attaches to it. With `-d` it stays in the background:

```sh
claudegrid -b tmux -d
tmux attach -t claudegrid-my-app
```

Inside tmux, it opens a new window in your current session instead.

Pane names are shown in the pane borders. Splits use percentages, so the grid stays even at any terminal size.

## kitty

claudegrid writes a kitty session file and starts `kitty --session`. kitty's `grid` layout places the panes in reading order. kitty picks the exact rows and columns itself, so `-l 1x3` can come out as a different shape.

## WezTerm

claudegrid uses `wezterm cli` to open a window in the WezTerm that is already running, then splits it with the same percentages as tmux. Start WezTerm first.
