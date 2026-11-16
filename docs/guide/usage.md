---
title: Usage
description: Open a grid of Claude Code sessions, pick a layout, give every pane its own prompt and model, and pass Claude Code flags to all of them.
---

# Usage

```sh
claudegrid [preset] [options] [-- claude flags]
```

## Layouts

`--layout` takes `COLSxROWS`, or a plain number of panes:

```sh
claudegrid                 # 2x2, four panes
claudegrid -l 3x2          # three columns, two rows
claudegrid -l 1x3          # one column, three stacked panes
claudegrid -n 5            # five panes: 3 columns of 2 + 2 + 1
```

A pane count picks the most square grid that fits. Up to 16 panes are allowed.

Panes are numbered in reading order: left to right, then top to bottom. Pane 1 is top left.

## A task per pane

Every `-p` gives the next pane its first prompt:

```sh
claudegrid -p "add a /health endpoint" -p "fix the failing tests" -p "review the diff"
```

Without `--layout`, the grid grows to fit your prompts, so five `-p` flags open five panes. With an explicit layout, more prompts than panes is an error. Panes without a prompt start an empty session.

## Models and flags

```sh
claudegrid -m opus                     # every pane on Opus
claudegrid -- --continue               # continue the last conversation in every pane
claudegrid -m sonnet -- --permission-mode plan
```

Everything after `--` goes to each `claude` as is. To give one pane a different model or flags, use a [config file](./configuration).

## Separate branches

```sh
claudegrid -w -n 3
```

`-w` gives every pane its own [git worktree](./worktrees) and branch, so agents don't overwrite each other's files.

## New tab or new window

When you run claudegrid inside Konsole, WezTerm or tmux, the grid opens as a **new tab** in that terminal. Pass `--no-new-tab`, or set `"newTab": false` in your config, to get a separate window instead:

```sh
claudegrid                 # new tab in this terminal
claudegrid --no-new-tab    # separate window
```

In Konsole, tabs use a `claudegrid` profile that claudegrid adds on its first run. Konsole only reads profiles when it starts, so the very first time claudegrid opens a window and tells you to restart Konsole. After that every grid is a tab. kitty always opens a new window. See [Terminals](./terminals) for details.

## Choosing a terminal

claudegrid uses the terminal you are already in. Force one with `-b`:

```sh
claudegrid -b tmux          # works anywhere, including over SSH
claudegrid -b tmux -d       # start the session in the background
```

See [Terminals](./terminals) for how each one is handled.

## Other programs

`--command` runs something other than `claude` in each pane. This is useful for testing a layout, or for other agent CLIs:

```sh
claudegrid --command htop -n 2
```

## When a session ends

When `claude` exits, the pane stays open and drops into your `$SHELL`. Pass `--no-keep-shell`, or set `"keepShell": false`, to close the pane instead.

Inside each pane these variables are set:

| Variable | Value |
| --- | --- |
| `CLAUDEGRID` | `1` |
| `CLAUDEGRID_GRID` | name of the grid |
| `CLAUDEGRID_PANE` | pane number, starting at 1 |
| `CLAUDEGRID_PANE_NAME` | pane name |
| `CLAUDEGRID_PANES` | number of panes |

## See before you run

```sh
claudegrid -l 3x2 -p "fix lint" --dry-run
claudegrid --json
```

`--dry-run` prints the plan and every command claudegrid would run. `--json` prints the plan as JSON for scripts.
