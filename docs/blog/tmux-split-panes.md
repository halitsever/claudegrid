---
title: "tmux Split Panes: Vertical, Horizontal and Grids"
titleTemplate: false
description: "Split tmux panes vertically and horizontally with keys or split-window, size them in percent, even them out with layouts, and build an exact grid."
date: 2026-11-28
faq:
  - q: "How do I split a tmux pane vertically?"
    a: "For panes side by side, press Ctrl-b % or run tmux split-window -h. For panes stacked top and bottom, press Ctrl-b \" or run tmux split-window -v, which is also the default."
  - q: "Why are tmux's horizontal and vertical names confusing?"
    a: "tmux names the split by how the panes are arranged: -h places them next to each other horizontally, so the dividing line is vertical. Many people describe it by the line instead, which is the opposite."
  - q: "How do I make all tmux panes the same size?"
    a: "Use a layout: Ctrl-b Alt-1 for even-horizontal, Ctrl-b Alt-2 for even-vertical, or Ctrl-b Alt-5 for tiled. Ctrl-b Space cycles through the layouts."
  - q: "How do I set the size of a new tmux pane?"
    a: "Pass -l to split-window, as lines or columns or as a percentage: tmux split-window -h -l 30% makes the new pane 30 percent of the width."
---

# tmux split panes: vertical, horizontal and grids

<p class="post-meta">Halit Sever · 28 November 2026</p>

tmux can split one window into as many panes as fit on the screen. This post covers the keys, the `split-window` command and its size option, the built-in layouts, and how to get an even grid of panes, which is what [claudegrid](/) does when it opens several Claude Code agents. Key bindings are tmux 3.6's defaults, listed with `tmux list-keys`.

## The two split keys

| Keys | Command | Result |
| --- | --- | --- |
| `Ctrl-b %` | `split-window -h` | new pane to the right, panes side by side |
| `Ctrl-b "` | `split-window` (same as `-v`) | new pane below, panes stacked |

The naming trips people up. tmux's manual calls `-h` "a horizontal split": the panes sit next to each other horizontally, so the line between them is vertical. If you search for "tmux split vertical" and mean a vertical divider, you want `-h`.

## Moving around

| Keys | Action |
| --- | --- |
| `Ctrl-b` arrow key | move to the pane in that direction |
| `Ctrl-b o` | next pane |
| `Ctrl-b q` | show pane numbers briefly |
| `Ctrl-b z` | zoom the current pane to full window and back |
| `Ctrl-b {` / `Ctrl-b }` | swap the pane with the previous or next one |
| `Ctrl-b !` | move the pane into its own window |
| `Ctrl-b x` | close the pane, after a y/n prompt |

With `set -g mouse on` in `~/.tmux.conf`, you can also click a pane to select it and drag a border to resize.

## split-window from the command line

The keys run `split-window`. The command takes more options:

```sh
tmux split-window -h                  # side by side
tmux split-window -v                  # stacked
tmux split-window -h -l 30%           # new pane gets 30% of the width
tmux split-window -v -l 10            # new pane gets 10 lines
tmux split-window -h -c "#{pane_current_path}"   # start in the same folder
tmux split-window -h -b               # new pane on the left instead
tmux split-window -h 'htop'           # run a command in the new pane
```

From the manual: `-l` is lines for a vertical split or columns for a horizontal one, and "may be followed by '%' to specify a percentage of the available space." Older guides use `-p 30` for percentages; current tmux takes `-l 30%`.

`-c "#{pane_current_path}"` is worth binding, so new panes open where you are:

```sh
bind % split-window -h -c "#{pane_current_path}"
bind '"' split-window -v -c "#{pane_current_path}"
```

## Even out panes with layouts

After a few splits the sizes are uneven. tmux has preset layouts that rearrange every pane in the window:

| Keys | Layout | Shape |
| --- | --- | --- |
| `Ctrl-b Alt-1` | `even-horizontal` | all panes side by side, equal widths |
| `Ctrl-b Alt-2` | `even-vertical` | all panes stacked, equal heights |
| `Ctrl-b Alt-3` | `main-horizontal` | one large pane on top, the rest below |
| `Ctrl-b Alt-4` | `main-vertical` | one large pane on the left, the rest on the right |
| `Ctrl-b Alt-5` | `tiled` | rows and columns, as even as possible |
| `Ctrl-b Space` | next layout | cycle through them |

From a script: `tmux select-layout tiled`.

## A grid in one go

`tiled` is the quickest way to a grid: split as many times as you need panes, then tile.

```sh
tmux new-session -d -s grid
tmux split-window -t grid
tmux split-window -t grid
tmux split-window -t grid
tmux select-layout -t grid tiled
tmux attach -t grid
```

That gives a 2x2 grid. The catch is that `tiled` decides rows and columns itself. Six panes come out as tmux sees fit, not necessarily three columns by two rows.

For an exact shape, split by percentage. To get three even columns, split the first pane at 67%, leaving it a third, then split the new pane at 50%:

```sh
tmux split-window -h -l 67%
tmux split-window -h -l 50%
```

Then split each column with `-v` for the rows. Because the sizes are percentages, the grid stays even when the terminal is resized.

## How claudegrid builds it

claudegrid does exactly this for Claude Code agents. `claudegrid -b tmux -l 3x2` creates the session, splits the columns from the top row with `split-window -h -l <n>%`, then splits each column with `split-window -v -l <n>%`, and starts `claude` in every pane. You can see every tmux command without running anything:

```sh
claudegrid -b tmux -l 3x2 --dry-run
```

It also names each pane in the border (`pane-border-status top`), setting the option only on its own window, so your `~/.tmux.conf` stays as it is. Each pane can get its own prompt with `-p`, and its own git branch with `-w`. See [Run Claude Code in tmux](/guide/tmux) and [Usage](/guide/usage).

## FAQ

<Faq />

## Related

- [tmux detach](/blog/tmux-detach): keep the grid running after you disconnect
- [iTerm2 split panes](/blog/iterm2-split-pane): the same idea on macOS
- [Terminals](/guide/terminals): how claudegrid builds grids in each terminal
- [Claude Code worktrees](/claude-code-worktree): one branch per pane
