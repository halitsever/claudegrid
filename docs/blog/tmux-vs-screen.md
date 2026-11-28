---
title: "tmux vs screen: Differences, Keys and When to Use Each"
titleTemplate: false
description: "tmux and GNU screen compared from their manuals: prefix keys, splits, detach and attach, scrollback, scripting, serial ports and which one to pick in 2026."
date: 2026-11-28
faq:
  - q: "Is tmux better than screen?"
    a: "For most people today, yes: splits, layouts and scripting are simpler in tmux and the defaults are more modern. screen still wins for serial consoles and is preinstalled on some older systems."
  - q: "Can I use screen keys in tmux?"
    a: "Yes. Set the prefix to Ctrl-a with set -g prefix C-a, unbind C-b and bind C-a send-prefix in ~/.tmux.conf. Many screen users do exactly that."
  - q: "Is GNU screen still maintained?"
    a: "Yes. GNU Screen 5.0.0 came out in August 2024, and 5.0.3 followed in November 2026 on ftp.gnu.org."
---

# GNU screen or tmux: how the two terminal multiplexers differ

<p class="post-meta">Halit Sever · 28 November 2026</p>

tmux and GNU screen do the same basic job: they keep shells running on a machine after you disconnect, and let one terminal hold several of them. They differ in defaults, in how splits work and in how easy they are to drive from scripts. The comparison below comes from the tmux 3.6 and GNU Screen 4.9.1 manual pages, and from running both.

## The short answer

Pick tmux for new setups, for split panes and for anything you want to script. Keep screen where it is already installed and you only need a session that survives a disconnect, or when you talk to a serial device.

## Side by side

| | tmux | GNU screen |
| --- | --- | --- |
| Prefix key | `Ctrl-b` | `Ctrl-a` |
| Start a named session | `tmux new -s work` | `screen -S work` |
| Detach | `Ctrl-b d` | `Ctrl-a d` |
| List sessions | `tmux ls` | `screen -ls` |
| Reattach | `tmux attach -t work` | `screen -r work` |
| Start detached | `tmux new -d -s work` | `screen -d -m -S work` |
| New window | `Ctrl-b c` | `Ctrl-a c` |
| Next / previous window | `Ctrl-b n` / `p` | `Ctrl-a n` / `p` |
| Split top and bottom | `Ctrl-b "` | `Ctrl-a S` |
| Split left and right | `Ctrl-b %` | `Ctrl-a \|` |
| Move between splits | `Ctrl-b` arrow | `Ctrl-a Tab` |
| Scrollback / copy mode | `Ctrl-b [` | `Ctrl-a [` |
| Default scrollback | 2000 lines | 100 lines |
| Config file | `~/.tmux.conf` | `~/.screenrc` |

## Splits are where they differ most

In tmux a split creates a **pane**, and each pane runs its own program. Panes belong to the window, so they are still there after you detach and attach again, and layouts such as `tiled` rearrange them in one key press.

In screen a split creates a **region**, an empty viewport. You then move into it with `Ctrl-a Tab` and pick or create a window to show there. The screen manual adds a catch: the arrangement of regions is kept across a reattach only through layouts (`layout save`), and "if the session ends or the screen process dies, the layout arrangements are lost". In practice screen users often run without splits, and tmux users rely on them.

## Sessions and the server

tmux runs one server per user and socket, and every session lives in it. `tmux ls`, `tmux kill-server` and commands sent from scripts all talk to that server. You can attach several clients to one session, and they see the same windows.

screen starts one process per session. `screen -x` attaches to a session that is already attached somewhere else, which is how two people share one screen. screen also has a full multiuser mode with access control lists (`multiuser on`, `acladd`).

## Scripting

Every tmux key runs a tmux command, and every command also works from a shell:

```sh
tmux new -d -s build
tmux split-window -h -t build
tmux send-keys -t build:0.1 'npm test' Enter
tmux capture-pane -p -t build:0.1
```

Targets like `build:0.1` (session, window, pane) and the `-F` format strings make it easy to build layouts and read state from scripts. screen can be scripted through `screen -X` and `-p`, but there is no equivalent of tmux's pane targets or formats.

## Where screen is still the right tool

- **Serial consoles.** `screen /dev/ttyUSB0 115200` opens a serial line directly; the screen manual documents connecting to a tty device with a baud rate. tmux has no serial support.
- **Old or minimal systems** where screen is installed and you cannot add packages.
- **Muscle memory**, although tmux can take screen's `Ctrl-a` prefix:

```sh
set -g prefix C-a
unbind C-b
bind C-a send-prefix
```

## Both are maintained

This post uses tmux 3.6. GNU Screen moved to a 5.0 series in August 2024, and 5.0.3 is the newest release on ftp.gnu.org at the time of writing. The machine these tests ran on has screen 4.9.1 from its distribution, which is where the manual quotes come from.

## Why claudegrid uses tmux

[claudegrid](/) opens a grid of Claude Code agents. Its tmux backend needs exact splits sized in percent, a name in each pane border and a session it can start detached and attach later, all from commands. tmux 3.1 or newer provides that; screen's regions do not. There is no screen backend, and on a server over SSH tmux is the one to use: see [Run Claude Code in tmux](/guide/tmux).

## FAQ

<Faq />

## Related

- [tmux cheat sheet](/blog/tmux-cheat-sheet)
- [tmux detach](/blog/tmux-detach)
- [The tmux config file](/blog/tmux-config)
- [Terminals claudegrid supports](/guide/terminals)
