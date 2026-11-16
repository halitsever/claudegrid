---
title: Troubleshooting
description: Fix common claudegrid problems such as a missing qdbus6, tmux being too old, claude not found in a pane or worktree errors.
---

# Troubleshooting

Start with:

```sh
claudegrid doctor
claudegrid --dry-run
```

## `no supported terminal found`

None of the four backends works here. The easiest fix is installing tmux, which runs inside any terminal.

## `the KDE Konsole backend is not usable: qdbus6 is missing`

Install the Qt 6 D-Bus tool. The package is `qt6-tools` on Arch, `qdbus-qt6` on Fedora and `qt6-tools-dev-tools` on Debian and Ubuntu.

## `konsole did not show up on D-Bus`

Konsole needs a D-Bus session bus. That is always there in a desktop session, but can be missing in SSH sessions or containers. Use `-b tmux` there.

## `claude was not found on PATH` in a pane

The pane inherits the environment claudegrid was started from. If `claude` only works through a shell alias, add its directory to `PATH` in your shell config instead.

## `tmux 3.0 is too old`

claudegrid sizes tmux splits with percentages, which needs tmux 3.1 or newer.

## `this repository has no commits yet`

Worktrees branch off `HEAD`, so make a first commit.

## `... already exists and is not a git worktree`

A folder is in the way where claudegrid wants to put a worktree, in `<repo>.claudegrid/`. Move it, or run `claudegrid worktrees clean`.

## The grid has the wrong shape in kitty

kitty's grid layout picks rows and columns by itself. Use tmux inside kitty (`-b tmux`) when you need an exact layout.

## Something else

[Open an issue](https://github.com/halitsever/claudegrid/issues/new?template=bug_report.md) with the output of `claudegrid doctor` and `claudegrid --dry-run`.
