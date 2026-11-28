---
title: "tmux Scroll Up: Copy Mode, Mouse and History"
titleTemplate: false
description: "Scroll up in tmux with Ctrl-b [ or Ctrl-b PageUp, turn on mouse wheel scrolling, search the scrollback, leave copy mode and keep more history lines."
date: 2026-11-28
faq:
  - q: "How do I scroll up in tmux?"
    a: "Press Ctrl-b then PageUp, or Ctrl-b [ to enter copy mode and then use PageUp and the arrow keys. Press q to leave copy mode."
  - q: "Why does my mouse wheel not scroll in tmux?"
    a: "Mouse support is off by default. Add set -g mouse on to ~/.tmux.conf and reload it. The wheel then enters copy mode and scrolls."
  - q: "How do I exit scroll mode in tmux?"
    a: "Press q. In the default emacs key mode Escape works too. Scrolling all the way back to the bottom with the mouse also leaves copy mode when it was entered by the wheel."
  - q: "Why can I not scroll back very far in tmux?"
    a: "tmux keeps 2000 lines per pane by default. Raise history-limit in ~/.tmux.conf. The new limit applies to new windows and panes only."
---

# How to scroll up in tmux, with keys or the mouse

<p class="post-meta">Halit Sever · 28 November 2026</p>

Inside tmux, your terminal's own scrollbar shows tmux's screen, not the program's history, so scrolling has to go through tmux. It keeps a history for every pane, and you read it in copy mode. Everything below was tested on tmux 3.6 with no config file.

## The keys

| Key | What it does |
| --- | --- |
| `Ctrl-b PageUp` | enter copy mode and scroll up one page |
| `Ctrl-b [` | enter copy mode without moving |
| `PageUp` / `PageDown` | scroll a page, once in copy mode |
| arrow keys | move the cursor; the view follows at the edges |
| `q` | leave copy mode and go back to the bottom |

While copy mode is on, tmux shows your position in the top right corner, such as `[22/1983]`: 22 lines up out of 1983 held. The program in the pane keeps running and its new output arrives as usual. You just are not looking at it until you leave copy mode.

`Ctrl-b PageUp` is the binding for `copy-mode -u`. You can run the same thing from a shell inside tmux:

```sh
tmux copy-mode -u
```

## Scrolling with the mouse wheel

Mouse support is off by default. Turn it on in `~/.tmux.conf`:

```sh
set -g mouse on
```

Then reload the config (`tmux source-file ~/.tmux.conf`). Rolling the wheel up over a pane enters copy mode and scrolls five lines per step; rolling back down to the bottom leaves it again. With the mouse on you can also click a pane to select it and drag pane borders to resize.

If the pane runs a full-screen program such as `vim`, `less` or `htop`, or a program that asked for mouse events, tmux passes the wheel to that program instead. That is the `alternate_on` and `mouse_any_flag` check in the default `WheelUpPane` binding.

One side effect: with the mouse on, tmux takes over click-and-drag, so your terminal's normal selection stops working inside tmux. Many terminals, kitty and Konsole among them, give you their own selection back while you hold `Shift`; check your terminal's documentation for the modifier it uses.

## Searching the scrollback

In copy mode with the default emacs keys:

| Key | What it does |
| --- | --- |
| `Ctrl-r` | search upwards, as you type |
| `Ctrl-s` | search downwards |
| `n` | next match |
| `Alt-<` | jump to the top of the history |
| `Alt->` | jump to the bottom |

With vi keys (`setw -g mode-keys vi`), `?` searches up, `/` searches down, `g` and `G` jump to the top and bottom, and `Ctrl-u` and `Ctrl-d` move half a page. tmux picks vi keys by itself when your `EDITOR` or `VISUAL` contains `vi`.

## Leaving copy mode

`q` always works. In emacs mode `Escape` does too; in vi mode `Escape` only clears the selection. To leave from a script or another pane:

```sh
tmux send-keys -t work:0 -X cancel
```

## Copying text while you are up there

| | emacs keys | vi keys |
| --- | --- | --- |
| start selecting | `Ctrl-Space` | `Space` |
| copy and leave | `Alt-w` | `Enter` |
| paste | `Ctrl-b ]` | `Ctrl-b ]` |

The copied text goes into a tmux buffer. With the mouse on, dragging selects and releasing copies. Whether it also reaches your system clipboard depends on the `set-clipboard` option and on your terminal supporting the OSC 52 escape sequence.

## Keeping more history

tmux keeps 2000 lines per pane by default. Older lines are dropped. To keep more:

```sh
set -g history-limit 50000
```

The manual is explicit that this only applies to new windows: a pane keeps the limit it was created with. We checked it on a test server. After `seq 1 5000` in a pane, it held 1983 lines with a limit of 2000. Raising the limit to 50000 left that pane at 2000, while a window opened afterwards reported 50000. Set it in `~/.tmux.conf` before you start the session, or open new panes after changing it.

Each line costs memory in the tmux server, per pane, so very large values add up when you run many panes.

To save the history to a file instead of scrolling through it:

```sh
tmux capture-pane -p -S - > pane.txt      # the whole history of the current pane
tmux clear-history                        # empty it
```

## A newer option: scrollbars

tmux 3.6 can draw a scrollbar in each pane:

```sh
set -g pane-scrollbars modal    # only while in copy mode
set -g pane-scrollbars on       # always
```

With the mouse on you can drag the slider. The pane gets narrower by the width of the bar while it is shown.

## Reading back through several agents

In a [claudegrid](/) tmux grid every Claude Code agent has its own pane and therefore its own history. `Ctrl-b` and an arrow picks the agent, `Ctrl-b z` zooms it to the full window, and `Ctrl-b PageUp` scrolls back through what it printed. `Ctrl-b z` again restores the grid. If you start large grids often, set `history-limit` in `~/.tmux.conf` before running `claudegrid -b tmux`, since the panes take the limit at the moment they are created.

## FAQ

<Faq />

## Related

- [tmux cheat sheet](/blog/tmux-cheat-sheet)
- [The tmux config file and how to reload it](/blog/tmux-config)
- [tmux split panes](/blog/tmux-split-panes)
- [Run Claude Code in tmux](/guide/tmux)
