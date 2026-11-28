---
title: "tmux Rename Window and Session: Keys and Commands"
titleTemplate: false
description: "Rename a tmux window with Ctrl-b , or rename-window, rename a session with Ctrl-b $, and stop automatic-rename from changing the names back behind you."
date: 2026-11-28
faq:
  - q: "How do I rename a window in tmux?"
    a: "Press Ctrl-b , then type the new name and press Enter. From a shell, run tmux rename-window name, or tmux rename-window -t session:index name for another window."
  - q: "How do I rename a tmux session?"
    a: "Press Ctrl-b $ inside tmux, or run tmux rename-session -t old new from any shell."
  - q: "Why does my tmux window name keep changing?"
    a: "automatic-rename is on by default and names the window after the running command. Naming a window yourself turns it off for that window; set-option -wg automatic-rename off turns it off everywhere."
---

# Renaming tmux windows and sessions so the names stick

<p class="post-meta">Halit Sever · 28 November 2026</p>

Window names show in the tmux status bar, and session names are what you type after `tmux attach -t`. Both can be set when you create them or renamed later. Tested on tmux 3.6.

## Rename the current window

Press `Ctrl-b ,`. The status line turns into a prompt holding the current name; delete it, type the new one and press Enter.

From a shell inside tmux:

```sh
tmux rename-window editor
```

`renamew` is the short alias.

## Rename another window

Give a target as `session:index` or `session:name`:

```sh
tmux rename-window -t api:0 editor
tmux list-windows -t api
```

```txt
0: editor* (1 panes) [80x24] [layout b25d,80x24,0,0,0] @0 (active)
1: logs (1 panes) [80x24] [layout b260,80x24,0,0,3] @3
```

This works from outside tmux too, as long as you talk to the same tmux server.

## Name it when you create it

```sh
tmux new -s api -n editor        # session api, first window editor
tmux new-window -n logs          # new window called logs
```

## Rename a session

| Where | How |
| --- | --- |
| inside tmux | `Ctrl-b $`, type the name, Enter |
| any shell | `tmux rename-session -t old new` |
| inside tmux, the current session | `tmux rename-session new` |

`rename` is the alias. Session names cannot keep colons or dots, because tmux uses those in targets such as `api:1.0`. tmux replaces them with underscores: a session created as `a.b:c` shows up in `tmux ls` as `a_b_c`.

## Why names change back

Two options decide whether a window keeps its name.

**automatic-rename** is on by default. tmux names the window after the command running in its active pane, using `automatic-rename-format`, which is `#{pane_current_command}` plus markers for copy mode and dead panes. So a window shows `zsh`, then `vim`, then `zsh` again.

The manual says automatic renaming is switched off for a single window as soon as you name it: with `-n` on `new-window` or `new-session`, with `rename-window`, or with a terminal escape sequence. We checked it: after `new-window -n logs`, that window reported `automatic-rename` as 0. To turn it off for every window:

```sh
set-option -wg automatic-rename off
```

**allow-rename** decides whether programs in the pane may rename the window with the `\ek...\e\\` escape sequence. It is off by default in tmux 3.6. If your window names change to whatever a remote shell prompt prints, check whether your config turns it on.

The pane title is a different thing. Programs set it with the usual terminal title sequence, it shows in `#{pane_title}`, and it does not rename the window unless your status format uses it.

## Using names in scripts

Names make targets readable:

```sh
tmux new -d -s api -n server
tmux new-window -t api -n tests
tmux send-keys -t api:server 'npm run dev' Enter
tmux send-keys -t api:tests 'npm test -- --watch' Enter
```

If two windows share a name, a target by name is ambiguous, so give them different names or use the index.

## How claudegrid names things

[claudegrid](/) names everything when it creates it, so automatic renaming never kicks in on its window. The session is `claudegrid-<name>`, where `<name>` is the `-t` value, the preset name or the repo folder name, with characters tmux does not allow replaced by `-`. If that session already exists, it adds `-2`, `-3` and so on. The window gets the grid's name, and each pane's name goes into a pane option that the pane border shows:

```sh
claudegrid -b tmux -d -t billing -p "fix the invoice rounding bug" -p "add tests for refunds"
tmux attach -t claudegrid-billing
```

Renaming the window or session afterwards with the keys above is fine; the agents keep running.

## FAQ

<Faq />

## Related

- [tmux cheat sheet](/blog/tmux-cheat-sheet)
- [tmux kill session](/blog/tmux-kill-session)
- [The tmux config file](/blog/tmux-config)
- [Run Claude Code in tmux](/guide/tmux)
