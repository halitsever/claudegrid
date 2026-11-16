---
title: How it works
description: How claudegrid uses a Konsole profile and the Konsole D-Bus API to split a window into four Claude Code panes.
---

# How it works

claudegrid has two modes in one script.

## Launcher

When you run `claudegrid`, it:

1. saves your current directory and arguments in `CLAUDEGRID_DIR` and `CLAUDEGRID_ARGS`
2. starts a separate Konsole process with the `claudegrid` profile
3. waits for that window's D-Bus service (`org.kde.konsole-<pid>`) to come up
4. splits the view left/right, then splits each half once more with `createSplit`, giving a 2x2 grid

## Pane

The `claudegrid` profile runs `claudegrid --pane` as its command. Every new pane, including the ones created by a split, inherits the environment, so it:

1. changes into `CLAUDEGRID_DIR`
2. runs `claude` with `CLAUDEGRID_ARGS`
3. replaces itself with your shell when `claude` exits
