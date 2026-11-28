---
title: Run Claude Code in tmux
description: "Run several Claude Code agents in one tmux window with claudegrid: an even grid, a task and git worktree per pane, and sessions you can reattach over SSH."
---

# Running a grid of Claude Code agents in tmux

tmux is the backend that works everywhere: in any terminal on Linux or macOS, on a server over SSH, and inside iTerm2 or kitty when you want an exact grid. claudegrid builds the tmux layout for you, starts `claude` in every pane and hands each pane its own prompt, model and branch.

You need tmux 3.1 or newer. `claudegrid doctor` shows the version it found.

```sh
sudo apt install tmux     # Debian, Ubuntu
brew install tmux         # macOS
```

## Start a grid in tmux

```sh
claudegrid -b tmux                                   # 2x2, four Claude Code panes
claudegrid -b tmux -l 3x2                            # six panes, three even columns
claudegrid -b tmux -p "fix the lint errors" -p "write tests for auth"
claudegrid -b tmux -w -n 3                           # three panes, each on its own git worktree
```

When you already run claudegrid inside tmux, `-b tmux` is not needed: `auto` picks tmux first, since tmux can run inside the other terminals. To always use tmux, set it in `.claudegrid.json`:

```json
{ "backend": "tmux" }
```

## Inside or outside tmux

| Where you run it                 | What opens                                                             |
| -------------------------------- | ---------------------------------------------------------------------- |
| inside tmux                      | a new window in your current session                                   |
| inside tmux, with `--no-new-tab` | a separate session, and tmux switches you to it                        |
| outside tmux                     | a session called `claudegrid-<name>`, attached in the current terminal |
| outside tmux, with `-d`          | the same session in the background                                     |

`<name>` is the `-t` value, the preset name, or the repo folder name. When a session with that name already exists, claudegrid adds `-2`, `-3` and so on.

## Detach and attach

A tmux session keeps running when you close the terminal or lose the SSH connection, and so do the Claude Code agents in it. Start the grid in the background and attach when you want to look:

```sh
claudegrid -b tmux -d -t refactor
tmux attach -t claudegrid-refactor
```

Inside the session, tmux's default keys apply: `Ctrl-b` then an arrow key moves between panes, `Ctrl-b z` zooms the current pane to full size and back, and `Ctrl-b d` detaches. `tmux kill-session -t claudegrid-refactor` closes every agent in it.

## Running on a server over SSH

Konsole, iTerm2, kitty and WezTerm need a desktop, so over SSH use tmux:

```sh
ssh my-server
cd ~/projects/my-app
claudegrid -b tmux -w
```

With `-w` every agent works on its own branch next to the repo, so parallel agents do not overwrite each other's files. [The --worktrees option](./worktrees) covers reviewing and cleaning them up.

## What claudegrid changes in tmux

Splits are sized in percentages, so the grid stays even when you resize the terminal. Each pane shows its name in the pane border. claudegrid sets the border options on its own window only, and leaves your `~/.tmux.conf` and your other windows alone.

When `claude` exits, the pane drops to a shell so you can read the output. Pass `--no-keep-shell` to close the pane instead.

`--dry-run` prints every tmux command claudegrid would run, without opening anything:

```sh
claudegrid -b tmux -l 2x1 --dry-run
```

## Related

- [Terminals](./terminals) compares tmux with the other backends.
- [Troubleshooting](./troubleshooting#tmux-3-0-is-too-old) covers a tmux that is too old.
