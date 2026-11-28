---
title: "tmux Cheat Sheet: Keys and Commands for tmux 3.6"
titleTemplate: false
description: "A tmux cheat sheet checked against tmux 3.6: sessions, windows, panes, copy mode and layouts, with each default key binding and the command it runs."
date: 2026-11-28
faq:
  - q: "What is the tmux prefix key?"
    a: "Ctrl-b by default. Press it, let go, then press the command key. Ctrl-b d detaches, Ctrl-b c opens a window, Ctrl-b % splits left and right."
  - q: "How do I see every tmux key binding?"
    a: "Press Ctrl-b ? inside tmux, or run tmux list-keys from a shell. Ctrl-b / then a key shows what that one key does."
  - q: "How do I change the tmux prefix to Ctrl-a?"
    a: "Add set -g prefix C-a, unbind C-b and bind C-a send-prefix to ~/.tmux.conf, then reload it with tmux source-file ~/.tmux.conf."
---

# Every tmux key and command you need, on one page

<p class="post-meta">Halit Sever · 28 November 2026</p>

Every default key below was read from a fresh tmux 3.6 server started with `tmux -f /dev/null`, so no config file changed it, and checked against the tmux 3.6 manual page. In the tables, `Ctrl-b x` means press `Ctrl-b`, let go, then press `x`.

## Start, attach and leave

These run from a normal shell, outside tmux.

| Command | What it does |
| --- | --- |
| `tmux` | start a new session |
| `tmux new -s work` | start a session called `work` |
| `tmux new -A -s work` | attach to `work`, or create it if it does not exist |
| `tmux ls` | list sessions |
| `tmux attach` | attach to the most recently used session |
| `tmux attach -t work` | attach to `work` |
| `tmux attach -d -t work` | attach and detach every other client |
| `tmux kill-session -t work` | end the session `work` |
| `tmux kill-server` | end every session |

`attach`, `new` and `ls` are aliases for `attach-session`, `new-session` and `list-sessions`. [tmux detach](/blog/tmux-detach) and [tmux kill session](/blog/tmux-kill-session) go through the details.

## Sessions

| Key | Command | What it does |
| --- | --- | --- |
| `Ctrl-b d` | `detach-client` | detach, the session keeps running |
| `Ctrl-b $` | `rename-session` | rename the session |
| `Ctrl-b s` | `choose-tree -Zs` | pick a session from a list |
| `Ctrl-b (` | `switch-client -p` | previous session |
| `Ctrl-b )` | `switch-client -n` | next session |
| `Ctrl-b L` | `switch-client -l` | last session used |
| `Ctrl-b D` | `choose-client -Z` | pick a client to detach |

## Windows

| Key | Command | What it does |
| --- | --- | --- |
| `Ctrl-b c` | `new-window` | new window |
| `Ctrl-b ,` | `rename-window` | rename the window |
| `Ctrl-b n` | `next-window` | next window |
| `Ctrl-b p` | `previous-window` | previous window |
| `Ctrl-b l` | `last-window` | the window you were in before |
| `Ctrl-b 0` to `9` | `select-window` | window by number |
| `Ctrl-b '` | `select-window` | prompt for a window index |
| `Ctrl-b w` | `choose-tree -Zw` | pick a window from a tree of all sessions |
| `Ctrl-b f` | `find-window` | search windows by name or content |
| `Ctrl-b .` | `move-window` | move the window to another index |
| `Ctrl-b &` | `kill-window` | close the window, after a y/n prompt |

Windows are numbered from 0. [Renaming windows](/blog/tmux-rename-window) covers names that keep changing by themselves.

## Panes

| Key | Command | What it does |
| --- | --- | --- |
| `Ctrl-b %` | `split-window -h` | split left and right |
| `Ctrl-b "` | `split-window` | split top and bottom |
| `Ctrl-b` arrow | `select-pane` | move to the pane in that direction |
| `Ctrl-b o` | `select-pane -t :.+` | next pane |
| `Ctrl-b ;` | `last-pane` | the pane you were in before |
| `Ctrl-b q` | `display-panes` | show pane numbers, press one to jump |
| `Ctrl-b z` | `resize-pane -Z` | zoom the pane to the full window and back |
| `Ctrl-b {` / `}` | `swap-pane -U` / `-D` | swap with the previous or next pane |
| `Ctrl-b !` | `break-pane` | move the pane into a window of its own |
| `Ctrl-b Ctrl-arrow` | `resize-pane` | resize by one cell |
| `Ctrl-b Alt-arrow` | `resize-pane ... 5` | resize by five cells |
| `Ctrl-b x` | `kill-pane` | close the pane, after a y/n prompt |
| `Ctrl-b m` | `select-pane -m` | mark the pane |

The resize keys are bound with `-r`, so after the first one you can press the arrow again without the prefix, for as long as `repeat-time` allows. [tmux split panes](/blog/tmux-split-panes) shows the same splits as commands, with sizes in percent.

## Layouts

| Key | Layout |
| --- | --- |
| `Ctrl-b Space` | next layout |
| `Ctrl-b Alt-1` | `even-horizontal`: side by side |
| `Ctrl-b Alt-2` | `even-vertical`: stacked |
| `Ctrl-b Alt-3` | `main-horizontal`: one big pane on top |
| `Ctrl-b Alt-4` | `main-vertical`: one big pane on the left |
| `Ctrl-b Alt-5` | `tiled`: as even a grid as possible |
| `Ctrl-b E` | spread panes out evenly (`select-layout -E`) |

## Copy mode and scrolling

| Key | What it does |
| --- | --- |
| `Ctrl-b [` | enter copy mode |
| `Ctrl-b PageUp` | enter copy mode and scroll one page up |
| `Ctrl-b ]` | paste the most recent buffer |
| `Ctrl-b =` | pick a buffer to paste from a list |
| `Ctrl-b #` | list buffers |

Inside copy mode the keys depend on `mode-keys`. The default is `emacs`, unless your `EDITOR` or `VISUAL` contains `vi`, in which case tmux picks vi keys.

| Action | emacs keys (default) | vi keys |
| --- | --- | --- |
| page up / down | `PageUp` / `PageDown` | `Ctrl-b` / `Ctrl-f` |
| half page up / down | | `Ctrl-u` / `Ctrl-d` |
| top / bottom of history | `Alt-<` / `Alt->` | `g` / `G` |
| search up / down | `Ctrl-r` / `Ctrl-s` | `?` / `/` |
| next match | `n` | `n` |
| start a selection | `Ctrl-Space` | `Space` |
| copy the selection | `Alt-w` or `Ctrl-w` | `Enter` |
| leave copy mode | `q` or `Escape` | `q` |

[Scrolling up in tmux](/blog/tmux-scroll-up) explains mouse scrolling and the history limit.

## Commands and help

| Key | What it does |
| --- | --- |
| `Ctrl-b :` | open the tmux command prompt |
| `Ctrl-b ?` | list every key binding |
| `Ctrl-b /` | ask what one key does |
| `Ctrl-b t` | show a clock |
| `Ctrl-b i` | show information about the window |
| `Ctrl-b ~` | show tmux's recent messages |
| `Ctrl-b r` | redraw the client |
| `Ctrl-b Ctrl-z` | suspend the tmux client |

Anything you can type at `Ctrl-b :` also works as `tmux <command>` from a shell inside the session, and as a line in `~/.tmux.conf`. [The tmux config file](/blog/tmux-config) has a short starting config and the reload command. tmux has no default key for reloading the config: `Ctrl-b r` redraws the screen.

## Five settings people change first

```sh
set -g mouse on                 # click panes, drag borders, scroll with the wheel
set -g history-limit 50000      # scrollback lines per pane (default 2000)
set -g base-index 1             # number windows from 1
setw -g mode-keys vi            # vi keys in copy mode
set -g renumber-windows on      # close gaps when a window is closed
```

## A grid of Claude Code panes

All of the above works in a [claudegrid](/) tmux session, which is an ordinary tmux session called `claudegrid-<name>`:

```sh
claudegrid -b tmux -l 3x2 -d -t api
tmux attach -t claudegrid-api
```

`Ctrl-b` and an arrow moves between agents, `Ctrl-b z` zooms one, `Ctrl-b [` scrolls back through its output and `Ctrl-b d` leaves them all running. claudegrid sets pane border titles on its own window only and does not touch your `~/.tmux.conf`.

## FAQ

<Faq />

## Related

- [tmux detach: leave a session running and come back](/blog/tmux-detach)
- [tmux split panes: vertical, horizontal and grids](/blog/tmux-split-panes)
- [How to scroll up in tmux](/blog/tmux-scroll-up)
- [The tmux config file and how to reload it](/blog/tmux-config)
- [Run Claude Code in tmux](/guide/tmux)
