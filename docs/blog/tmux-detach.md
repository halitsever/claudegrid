---
title: "tmux Detach: Leave a Session Running and Come Back"
titleTemplate: false
description: "How to detach from tmux with Ctrl-b d, detach a session from outside, kick other clients off, and attach again later, including over SSH."
date: 2026-11-28
faq:
  - q: "How do I detach from tmux?"
    a: "Press Ctrl-b, let go, then press d. The session keeps running in the background. You can also type tmux detach at a shell prompt inside tmux."
  - q: "How do I get back into a detached tmux session?"
    a: "Run tmux attach to join the most recently used session, or tmux attach -t name for a specific one. tmux ls lists the sessions that are running."
  - q: "Does detaching from tmux stop my programs?"
    a: "No. Detaching only disconnects your terminal. Programs in the session keep running until you kill the session, the program exits, or the machine reboots."
  - q: "How do I detach other clients from a tmux session?"
    a: "Run tmux attach -d -t name to attach and detach every other client at once, or press Ctrl-b D inside tmux to pick a client to detach from a list."
---

# How to detach from tmux and attach again later

<p class="post-meta">Halit Sever · 28 November 2026</p>

Detaching is the reason most people use tmux. You start a long job inside a tmux session, detach, close the terminal or the SSH connection, and the job keeps running. Later you attach again and find it exactly where it was. This post covers every way to detach and attach, checked against the tmux 3.6 manual page and its default key bindings.

## The key: Ctrl-b d

Inside tmux, press `Ctrl-b`, release it, then press `d`. tmux prints something like:

```txt
[detached (from session claude)]
```

and you are back at the shell you started from. `Ctrl-b` is tmux's default prefix key, and `d` is bound to `detach-client`. If your `~/.tmux.conf` changes the prefix (`Ctrl-a` is a common choice), use that instead.

## Detach with a command

The same thing as a command, from a shell inside tmux:

```sh
tmux detach
```

`detach` is the short alias for `detach-client`. It has a few useful forms:

| Command | What it does |
| --- | --- |
| `tmux detach` | detach the current client |
| `tmux detach -s claude` | detach every client attached to session `claude` |
| `tmux detach -a` | detach every client except the current one |
| `tmux detach -P` | detach and send SIGHUP to the client's parent, which usually closes the terminal or SSH session too |

`-s` is handy from outside tmux, for example in a script that wants a session to run unwatched.

## See what is running

```sh
tmux ls
```

```txt
claude: 1 windows (created Fri Nov 28 09:12:41 2026)
claudegrid-refactor: 1 windows (created Fri Nov 28 09:40:03 2026)
```

`tmux ls` is short for `tmux list-sessions`. A session marked `(attached)` has a terminal looking at it right now.

## Attach again

```sh
tmux attach                 # the most recently used session
tmux attach -t claude       # a session by name
tmux a -t claude            # the same, shorter
```

When tmux has to choose, it prefers the most recently used session that nobody is attached to.

To attach to a session if it exists and create it if it does not, use `new-session` with `-A`:

```sh
tmux new -A -s claude
```

This is a good line for a shell alias or an SSH app's "run on connect" field.

## Detach everyone else

If the session is still attached somewhere else, say your laptop at home, attaching from your phone shares it: both screens show the same windows, and by default (`window-size latest`) the window follows the size of whichever client was used last. To take it over:

```sh
tmux attach -d -t claude
```

`-d` detaches every other client as you attach. Inside tmux, `Ctrl-b D` opens a list of attached clients to pick one to detach.

## Does it survive closing the terminal?

Yes. Closing a terminal window or losing an SSH connection detaches the client, and the session stays. That is why tmux is the standard way to keep work running on a remote machine. Two things do end a session: `tmux kill-session -t name` (or exiting every window in it), and a reboot. [tmux kill session](/blog/tmux-kill-session) covers the variants. tmux also has a `destroy-unattached` option, off by default, that would end a session when its last client leaves.

## Running Claude Code agents you can detach from

[claudegrid](/) opens a grid of Claude Code sessions in tmux. With `-d` it starts the session in the background without attaching at all:

```sh
claudegrid -b tmux -d -t refactor
tmux attach -t claudegrid-refactor
```

Each pane runs `claude` with its own prompt, and with `-w` its own git worktree. Detach with `Ctrl-b d` and the agents keep working; attach from another machine to check on them. On a server:

```sh
ssh my-server
cd ~/projects/my-app
claudegrid -b tmux -w -d -t refactor
exit
```

Inside a claudegrid session the usual keys apply: `Ctrl-b` and an arrow key moves between panes, `Ctrl-b z` zooms one pane to full size and back, and `Ctrl-b d` detaches. `tmux kill-session -t claudegrid-refactor` stops every agent in it. [Run Claude Code in tmux](/guide/tmux) covers the rest.

## Common problems

**"sessions should be nested with care, unset $TMUX to force"**: you ran `tmux` or `tmux attach` inside tmux. Use `Ctrl-b s` to switch sessions instead, or detach first.

**"no server running"** or **"can't find session"**: nothing is running under that name, or it runs under another user or tmux socket. Sessions started with `sudo` belong to root.

**The window is smaller than your terminal, with dots around it**: another client sets the size. Attach with `-d`, or detach the other client.

## FAQ

<Faq />

## Related

- [tmux split panes](/blog/tmux-split-panes): build a grid by hand
- [tmux kill session](/blog/tmux-kill-session): end sessions you no longer need
- [tmux cheat sheet](/blog/tmux-cheat-sheet): every default key on one page
- [Run Claude Code in tmux](/guide/tmux): claudegrid's tmux backend
- [Claude Code worktrees](/claude-code-worktree): one branch per agent
- [Claude Code over SSH](https://projects.halit.org/claude-code-vps/blog/claude-code-ssh): the server setup around it
