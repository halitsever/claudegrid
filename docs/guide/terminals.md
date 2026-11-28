---
title: Terminals
description: How claudegrid builds Claude Code grids in KDE Konsole, iTerm2, Terminal.app, tmux, kitty and WezTerm, and how it picks one automatically.
---

# Supported terminals and backends

claudegrid has six backends. With `backend: "auto"`, the default, it picks:

1. the terminal you are running in (tmux first, since it can run inside the others)
2. otherwise the first one available out of Konsole, iTerm2, kitty, WezTerm, tmux and Terminal.app

`claudegrid doctor` shows which backends work on your machine and which one `auto` would use.

| Backend | Opens | With `--no-new-tab` | Exact grid | Needs |
| --- | --- | --- | --- | --- |
| `konsole` | a new tab when you run it in Konsole, otherwise a new window | a new window | yes | `konsole`, `qdbus6`, a D-Bus session |
| `iterm2` | a new tab when you run it in iTerm2, otherwise a new window | a new window | even layouts only, see below | macOS, iTerm2 |
| `tmux` | a new tmux window when you are in tmux, otherwise a new session | a separate session it switches to | yes | tmux 3.1+ |
| `kitty` | a new kitty window | the same | kitty's grid layout | `kitty` |
| `wezterm` | a new tab when you run it in WezTerm, otherwise a new window | a new window | yes | WezTerm running |
| `terminal` | one Terminal.app window per pane, tiled over the main screen | the same | yes, as windows | macOS |

The [desktop app](./app) always opens a new window, since it does not run inside a terminal.

## How a pane starts

claudegrid writes a small launch file (mode 600) to `$XDG_RUNTIME_DIR/claudegrid-<uid>/`. It holds each pane's name, directory and command. Every pane runs `claudegrid pane`, which reads that file, prints a one-line header, changes into the pane's directory and starts `claude`. The files are removed after a day.

This means claudegrid never types commands into your shell, and prompts with quotes or newlines arrive exactly as written.

## Konsole

### New tab

In Konsole, claudegrid talks to the window it runs in over D-Bus. It opens a tab with the `claudegrid` profile and splits it into the grid. Each pane in that tab runs `claudegrid pane --konsole-tab`, which waits for a small note claudegrid writes once it knows the pane's session number. That is how every pane gets its own task.

The `claudegrid` profile lives in `~/.local/share/konsole/claudegrid.profile` and copies your default profile, so fonts and colors stay the same. The `.deb` and AUR packages also ship it in `/usr/share/konsole`. Konsole only reads profiles at startup: when the window you are in started before the profile existed, claudegrid opens a new window for that one launch and asks you to restart Konsole.

Only the splits inside the new tab are resized, your other tabs stay as they are.

### New window

With `--no-new-tab`, or outside Konsole, claudegrid starts `konsole --separate` with a temporary profile, then builds the grid over Konsole's D-Bus API:

1. split the first view left and right until there are enough columns
2. split each column top and bottom until it has its rows
3. resize every splitter so all panes are the same size

The temporary profile copies your default Konsole profile, so fonts and colors stay the same.

Every Konsole session knows its own number from `KONSOLE_DBUS_SESSION`, and claudegrid uses that to tell each pane which task it has.

## iTerm2

On macOS claudegrid drives iTerm2 with AppleScript: it opens a window, or a tab when you run it in iTerm2, and splits it into the grid. Each pane runs a one line script that starts `claudegrid pane` for that pane, so there is no quoting to go wrong. Pane titles show the pane names.

iTerm2 can only split a pane in half. Layouts with 1, 2 or 4 columns and rows come out exact, a `3x2` grid has columns of 50, 25 and 25 percent. Use tmux inside iTerm2 (`-b tmux`) when you need three even columns.

macOS asks once whether your terminal may control iTerm2. If you said no, allow it in **System Settings → Privacy & Security → Automation**.

## tmux

[Run Claude Code in tmux](./tmux) is the full guide, including SSH and detached sessions.

Inside tmux, claudegrid opens a new window in your current session. With `--no-new-tab` it creates a separate session and switches you to it.

Outside tmux, claudegrid creates a session called `claudegrid-<name>` and attaches to it. With `-d` it stays in the background:

```sh
claudegrid -b tmux -d
tmux attach -t claudegrid-my-app
```

Pane names are shown in the pane borders. Splits use percentages, so the grid stays even at any terminal size.

## kitty

claudegrid writes a kitty session file and starts `kitty --session`. kitty's `grid` layout places the panes in reading order. kitty picks the exact rows and columns itself, so `-l 1x3` can come out as a different shape.

## WezTerm

claudegrid uses `wezterm cli` to add a tab to the WezTerm window it runs in, or a new window when it runs elsewhere or with `--no-new-tab`, then splits it with the same percentages as tmux. Start WezTerm first.

## Terminal.app

Terminal.app cannot split a window, so claudegrid opens one window per pane over AppleScript and tiles them over the main screen in the grid's shape. `auto` only picks it when no other backend works, since tmux inside Terminal.app gives a real split. Ask for it with `-b terminal` or `"backend": "terminal"`. The first launch asks whether your terminal may control Terminal.
