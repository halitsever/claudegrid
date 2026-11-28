---
title: "tmux Config File: Location, Examples and Reload"
titleTemplate: false
description: "Where the tmux config file lives (~/.tmux.conf or ~/.config/tmux/tmux.conf), a short tested starting config, and how to reload it without restarting tmux."
date: 2026-11-28
faq:
  - q: "Where is the tmux config file?"
    a: "tmux reads /etc/tmux.conf and then ~/.tmux.conf, or $XDG_CONFIG_HOME/tmux/tmux.conf, or ~/.config/tmux/tmux.conf. None exists until you create one."
  - q: "How do I reload the tmux config?"
    a: "Run tmux source-file ~/.tmux.conf from a shell inside tmux, or press Ctrl-b : and type source-file ~/.tmux.conf. The tmux server applies it without a restart."
  - q: "Why did removing a line from tmux.conf not change anything?"
    a: "Reloading runs the file again on the running server, it does not reset options. A removed set line leaves the old value in place until you set it back or restart the server."
---

# Where tmux reads its config, and how to reload it

<p class="post-meta">Halit Sever · 28 November 2026</p>

tmux works without any config file, and most people start one only to turn on the mouse or change the prefix key. This post covers where tmux looks for the file, a short config where every line was tested on tmux 3.6, and the reload command.

## Where the file goes

From the FILES section of the tmux 3.6 manual, tmux reads the system file first and then the first user file it finds:

| File | Use |
| --- | --- |
| `/etc/tmux.conf` | system-wide, for every user |
| `~/.tmux.conf` | the classic location |
| `$XDG_CONFIG_HOME/tmux/tmux.conf` | when `XDG_CONFIG_HOME` is set |
| `~/.config/tmux/tmux.conf` | the XDG default |

None of them exist after installing tmux. Create one:

```sh
mkdir -p ~/.config/tmux
$EDITOR ~/.config/tmux/tmux.conf
```

or simply edit `~/.tmux.conf`. Pick one, not both, so you always know which one is read.

`tmux -f /path/to/file` uses another file instead, and `tmux -f /dev/null` starts with none at all, which is handy for checking whether a problem comes from your config.

## A starting config

```sh
# Mouse: click panes, drag borders, scroll with the wheel
set -g mouse on

# More scrollback per pane (default 2000 lines)
set -g history-limit 50000

# Number windows and panes from 1, and close gaps
set -g base-index 1
setw -g pane-base-index 1
set -g renumber-windows on

# vi keys in copy mode
setw -g mode-keys vi

# Reload this file with Ctrl-b r
bind r source-file ~/.tmux.conf \; display "tmux.conf reloaded"
```

Every line is an ordinary tmux command. `set` is short for `set-option`, `setw` for `set-window-option`, and `-g` sets the global value that every session and window inherits. If your file lives under `~/.config/tmux/`, change the path in the `bind r` line.

Binding `r` replaces tmux's default for that key, `refresh-client`, which redraws the screen. That is a fair trade for most people; pick another key if you use it.

## Reloading the config

tmux reads its config when the server starts, which is when the first session starts. Editing the file changes nothing in sessions that are already running until you load it again:

```sh
tmux source-file ~/.tmux.conf
```

Run it from a shell inside tmux, or press `Ctrl-b :` and type `source-file ~/.tmux.conf`. With the binding above, `Ctrl-b r` does it.

A reload runs the file again; it does not reset anything first. We checked this on a test server: with `set -g mouse on` in the file, then that line removed and the file reloaded, `mouse` was still `on`. To undo a setting, set it back explicitly (`set -g mouse off`) or restart the server with `tmux kill-server`, which ends every session.

Some settings also apply only to things created afterwards. `history-limit` is one: existing panes keep the limit they were created with.

## Checking a config for mistakes

`source-file -n` parses the file without running it, and `-v` prints each command with its line number:

```sh
tmux source-file -nv ~/.tmux.conf
```

A typo comes back with the file and line:

```txt
/home/me/.tmux.conf:3: unknown command: sett
```

and the command exits with status 1, so it also works in scripts that install dotfiles.

## Changing the prefix to Ctrl-a

```sh
set -g prefix C-a
unbind C-b
bind C-a send-prefix
```

`send-prefix` lets you press `Ctrl-a` twice to send a real `Ctrl-a` to the program in the pane, such as the shell's move to start of line.

## Colors and terminal type

tmux sets `TERM` inside panes from its `default-terminal` option, which is `tmux-256color` in tmux 3.6. If programs on a server you SSH into from inside tmux complain about an unknown terminal, that server lacks the terminfo entry; [the xterm-kitty fix](/blog/xterm-kitty-unknown-terminal-type) covers the same problem for kitty.

## claudegrid and your config

[claudegrid](/) does not write to your tmux config. When it builds a grid it sets `pane-border-status` and `pane-border-format` on its own window only, so the pane names show at the top of each Claude Code pane while your other windows keep your settings. Options you set globally, such as `mouse` and `history-limit`, apply to claudegrid's panes like any other.

## FAQ

<Faq />

## Related

- [tmux cheat sheet](/blog/tmux-cheat-sheet)
- [How to scroll up in tmux](/blog/tmux-scroll-up)
- [tmux vs screen](/blog/tmux-vs-screen)
- [Fix xterm-kitty unknown terminal type](/blog/xterm-kitty-unknown-terminal-type)
