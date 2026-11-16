---
title: Usage
description: Run claudegrid in any project directory and pass Claude Code flags like --continue or --model to all four panes.
---

# Usage

Go to a project and run:

```sh
cd ~/my-project
claudegrid
```

A new Konsole window opens with four panes. Each pane runs `claude` in `~/my-project`.

## Passing flags to Claude Code

Every argument after `claudegrid` goes to each `claude` instance, quoted safely:

```sh
claudegrid --continue
claudegrid --model opus
claudegrid "review the open TODOs"
```

## When a session ends

If you exit `claude` in a pane, the pane stays open and drops into your `$SHELL`, so you can keep working there or start `claude` again.
