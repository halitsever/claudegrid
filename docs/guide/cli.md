---
title: CLI reference
description: Every claudegrid command and option, from launching grids to init, doctor, presets, worktrees and shell completion.
---

# CLI reference

## claudegrid

```txt
claudegrid [preset] [options] [-- claude flags]
```

| Option | Description |
| --- | --- |
| `-l, --layout <grid>` | `COLSxROWS` like `3x2`, or a pane count. Default `2x2` |
| `-n, --panes <count>` | same as `--layout <count>` |
| `-p, --prompt <text>` | prompt for the next pane. Repeat it for more panes |
| `-m, --model <model>` | model for every pane |
| `-w, --worktrees` | one git worktree and branch per pane |
| `--no-worktrees` | turn worktrees off when the config turns them on |
| `-b, --backend <name>` | `auto`, `konsole`, `iterm2`, `tmux`, `kitty`, `wezterm` or `terminal` |
| `-C, --cwd <dir>` | run from this directory |
| `-c, --config <file>` | use this config instead of `.claudegrid.json` |
| `-t, --name <name>` | name for the window, tmux session and worktree group |
| `--command <cmd>` | run another program instead of `claude` |
| `--no-keep-shell` | close the pane when the program exits |
| `--no-new-tab` | open a new window instead of a tab in the terminal you are in |
| `--no-trust` | let Claude Code ask its folder trust question in every pane. By default claudegrid marks the pane folders as trusted |
| `-d, --detach` | start the tmux session without attaching |
| `--dry-run` | print the plan and the commands, open nothing |
| `--json` | print the plan as JSON |
| `-h, --help` | help |
| `-v, --version` | version |

Everything after `--` is passed to every `claude`.

## claudegrid ui

Opens the [desktop app](./app) in its own window.

| Option | Description |
| --- | --- |
| `-C, --cwd <dir>` | project to open first |
| `--port <port>` | fixed port instead of a random one |
| `--no-open` | print the link without opening a window |
| `--keep-alive` | keep the server running after the window closes |

## claudegrid desktop

`claudegrid desktop install` adds claudegrid to your app menu. `claudegrid desktop uninstall` removes it.

## claudegrid init

Creates `.claudegrid.json` at the root of the git repo, or in the current directory outside a repo. It has four example panes and two presets. `--force` overwrites an existing file.

## claudegrid doctor

Checks Node.js, Claude Code, git, every terminal backend and your config files. It exits with 1 when claudegrid cannot launch.

## claudegrid presets

Lists presets from the project and user config. `--names` prints only the names, which the shell completions use.

## claudegrid worktrees

| Command | Description |
| --- | --- |
| `claudegrid worktrees` | list claudegrid worktrees with changed files and commits ahead |
| `claudegrid worktrees clean` | remove clean worktrees and merged branches |
| `... clean --force` | also remove worktrees with changes and unmerged branches |
| `... clean --keep-branches` | remove worktrees but keep every branch |
| `... clean --dry-run` | only show what would be removed |

## claudegrid completion

```sh
claudegrid completion bash|zsh|fish
```

Prints a completion script. See [Getting started](./getting-started#shell-completion).

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | success |
| 1 | an error, with a message and usually a hint |
