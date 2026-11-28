---
title: "tmux Kill Session: One, All Others or Every Session"
titleTemplate: false
description: "End a tmux session with kill-session -t, kill every session but one, stop the whole server, close windows and panes, and what each one does to your programs."
date: 2026-11-28
faq:
  - q: "How do I kill a tmux session?"
    a: "Run tmux kill-session -t name from any shell. Inside tmux you can press Ctrl-b : and type kill-session. tmux ls shows the names."
  - q: "How do I kill all tmux sessions?"
    a: "tmux kill-server ends every session and the tmux server itself. tmux kill-session -a ends all sessions except the current one, or except the one given with -t."
  - q: "How do I exit tmux without killing the session?"
    a: "Detach with Ctrl-b d. The session and its programs keep running, and tmux attach brings you back."
---

# Killing tmux sessions without losing the wrong one

<p class="post-meta">Halit Sever · 28 November 2026</p>

Killing a tmux session closes its windows and ends the programs running in them. If you only want to leave and come back later, detach instead with `Ctrl-b d`. The commands below were run on tmux 3.6, and the output shown is what that server printed.

## Kill one session

Find the name first:

```sh
tmux ls
```

```txt
claudegrid-refactor: 1 windows (created Sat Nov 28 08:04:14 2026)
notes: 1 windows (created Sat Nov 28 08:04:14 2026)
work: 1 windows (created Sat Nov 28 08:04:14 2026)
```

Then:

```sh
tmux kill-session -t notes
```

`kill-session` destroys the session, closes the windows linked only to it and detaches any client looking at it. Without `-t` it kills the current session, which is what you want when you type it inside tmux. Exact names avoid surprises: `-t =notes` matches only a session called `notes`, while plain `-t notes` also accepts a name that starts with `notes`.

Inside tmux you can do the same from the command prompt: press `Ctrl-b :`, type `kill-session` and press Enter. tmux has no default key for it.

## Kill every session except one

```sh
tmux kill-session -a              # all sessions except the current one
tmux kill-session -a -t work      # all sessions except work
```

On the test server above, `tmux kill-session -a -t work` left only `work`. This is the tidy-up command after a day of throwaway sessions.

## Kill all sessions at once

```sh
tmux kill-server
```

This ends the tmux server, every session in it and every program those sessions were running. Afterwards `tmux ls` prints `no server running on /tmp/tmux-1000/default` and exits with status 1. Run it only when you mean every session, including ones another terminal or another machine is attached to.

If you started tmux with `-L name` or `-S path`, that is a separate server with its own sessions, and you need the same flag to reach it: `tmux -L name kill-server`.

## Windows and panes

| To close | Key | Command |
| --- | --- | --- |
| the current pane | `Ctrl-b x`, then `y` | `tmux kill-pane` |
| the current window | `Ctrl-b &`, then `y` | `tmux kill-window` |
| a window by target | | `tmux kill-window -t work:2` |
| every other pane in the window | | `tmux kill-pane -a` |

Typing `exit` in the shell of the last pane has the same effect as killing that pane. When the last window of a session closes, the session ends, and when the last session ends, the server exits. That is the `exit-empty` option, on by default.

## What happens to the programs

tmux closes the pseudo-terminal of each pane, so programs receive a hangup signal (`SIGHUP`), the same way they would when an SSH connection drops without tmux. We checked it with a shell that traps `SIGHUP` and writes a file: after `kill-session` the file said it got the signal. Most programs simply exit. A program that ignores the signal, or one started with `nohup` or as a separate daemon, keeps running after its pane is gone, and you then have to stop it with `kill` like any other process.

Work saved to disk is not touched. Unsaved editor buffers and anything held only in memory are gone.

## Killing a session that will not die

- **"can't find session"**: the name is wrong or the session runs under another user or another tmux socket. Sessions started with `sudo tmux` belong to root's server.
- **The session comes back**: something recreates it, for example a shell alias like `tmux new -A -s main` in your shell startup files, or a systemd unit.
- **"no server running"**: there is nothing left to kill.

## Stopping a grid of Claude Code agents

A [claudegrid](/) tmux grid is one session named `claudegrid-<name>`, so one command stops every agent in it:

```sh
tmux kill-session -t claudegrid-refactor
```

The git worktrees the agents used stay on disk, with their uncommitted changes. That is on purpose: killing the session should not throw away work. Clean them up when you are done reviewing:

```sh
claudegrid worktrees              # list them, with changes and commits ahead
claudegrid worktrees clean        # remove clean worktrees and merged branches
```

Without `--force`, `clean` skips worktrees that have uncommitted changes and keeps branches with unmerged commits. [git worktree remove](/blog/git-worktree-remove) explains what happens underneath.

## FAQ

<Faq />

## Related

- [tmux detach: leave a session running and come back](/blog/tmux-detach)
- [tmux cheat sheet](/blog/tmux-cheat-sheet)
- [Renaming tmux windows and sessions](/blog/tmux-rename-window)
- [git worktree remove, prune and cleanup](/blog/git-worktree-remove)
