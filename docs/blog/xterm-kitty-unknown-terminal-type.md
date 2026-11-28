---
title: "Fix \"'xterm-kitty': unknown terminal type\" over SSH"
titleTemplate: false
description: "Why SSH from kitty prints 'xterm-kitty': unknown terminal type, and four fixes: kitten ssh, copying the terminfo, kitty-terminfo, or a fallback TERM."
date: 2026-11-28
faq:
  - q: "What does 'xterm-kitty': unknown terminal type mean?"
    a: "kitty sets TERM=xterm-kitty, and the machine you SSH into has no terminfo entry with that name, so programs like clear, nano and tmux cannot look up how to drive the terminal."
  - q: "What is the quickest fix for xterm-kitty over SSH?"
    a: "Connect with kitten ssh myserver instead of ssh. It copies kitty's terminfo to the server automatically. kitten ssh takes the same arguments as ssh."
  - q: "How do I fix it for sudo or root?"
    a: "sudo often drops the TERMINFO variable. Install the kitty-terminfo package on the server, or keep the variable with Defaults env_keep += \"TERM TERMINFO\" in sudoers."
  - q: "Is setting TERM=xterm-256color a good fix?"
    a: "It works as a fallback, but programs then treat kitty as a generic xterm and skip kitty-specific features. Copying the real terminfo is the better fix."
---

# "'xterm-kitty': unknown terminal type" over SSH: why it happens and four fixes

<p class="post-meta">Halit Sever · 28 November 2026</p>

You open kitty, SSH into a server, run `clear` or `nano`, and get:

```txt
'xterm-kitty': unknown terminal type.
```

tmux says the same thing in its own words:

```txt
missing or unsuitable terminal: xterm-kitty
```

Arrow keys and Backspace may also behave oddly. The cause and the fixes come from [kitty's FAQ](https://sw.kovidgoyal.net/kitty/faq/) and its ssh kitten docs, checked on 28 November 2026.

## Why it happens

Every terminal tells programs what it is through the `TERM` variable. kitty sets `TERM=xterm-kitty`. Programs look that name up in the terminfo database to learn which escape codes the terminal understands. SSH passes `TERM` along to the server, but the server's terminfo database has no `xterm-kitty` entry unless someone installed it. The lookup fails and the program gives up.

kitty's FAQ puts the root cause in one line: "the kitty terminfo files not being available."

## Fix 1: kitten ssh

kitty ships an SSH wrapper that copies the terminfo for you:

```sh
kitten ssh myserver
```

It takes the same arguments as `ssh`, copies the terminfo on connect, and also turns on kitty's shell integration on the remote machine. The FAQ suggests an alias so you do not have to think about it:

```sh
alias s="kitten ssh"
```

## Fix 2: copy the terminfo once

If you prefer plain `ssh`, copy the entry to the server once, from your own machine:

```sh
infocmp -a xterm-kitty | ssh myserver tic -x -o \~/.terminfo /dev/stdin
```

`infocmp` prints kitty's terminfo, and `tic` on the server compiles it into `~/.terminfo` for your user. After that, plain `ssh` works. If the server's `tic` cannot read from standard input (macOS) or a proxy gets in the way, save the `infocmp` output to a file, copy it over and run `tic` on it there.

## Fix 3: install kitty-terminfo on the server

With root on a current Linux distribution, install the terminfo system-wide:

```sh
sudo apt install kitty-terminfo      # Debian, Ubuntu
```

This also covers every user on the machine and root, which fixes 1 and 2 do not.

## Fix 4: sudo and root

Programs run through `sudo` or `su` often lose the `TERMINFO` variable that points at your `~/.terminfo`, so the error comes back only as root. Either install `kitty-terminfo` (fix 3), or keep the variables in sudo with `sudo visudo`:

```txt
Defaults env_keep += "TERM TERMINFO"
```

## The fallback: change TERM

When you cannot change the server at all:

```sh
TERM=xterm-256color ssh myserver
```

Programs then treat kitty as a generic xterm. Colors and basic keys work, but features specific to kitty are not used. Treat it as a stopgap.

## Why this comes up with claudegrid

[claudegrid](/) opens a grid of Claude Code agents, and kitty is one of its backends: it writes a kitty session file and starts `kitty --session` with the panes in kitty's grid layout. A common setup is kitty on the laptop and the agents on a server, in which case the grid runs in tmux over SSH:

```sh
kitten ssh my-server
cd ~/projects/my-app
claudegrid -b tmux -w
```

If the server lacks kitty's terminfo, tmux refuses to start with the `missing or unsuitable terminal` message above. Any of the fixes here clears it. kitty's grid layout also picks rows and columns itself, so for an exact shape on the laptop, run tmux inside kitty with `-b tmux`. See [Terminals](/guide/terminals).

## FAQ

<Faq />

## Related

- [tmux detach](/blog/tmux-detach): keep the server session running
- [tmux split panes](/blog/tmux-split-panes): grids by hand
- [tmux config file](/blog/tmux-config): default-terminal and other settings
- [Run Claude Code in tmux](/guide/tmux): claudegrid over SSH
- [Troubleshooting](/guide/troubleshooting): other claudegrid problems
