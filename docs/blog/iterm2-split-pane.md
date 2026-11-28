---
title: "iTerm2 Split Panes and Opening Them From a Script"
titleTemplate: false
description: "iTerm2 split pane shortcuts, opening split panes in the same directory, broadcast input, and building a grid of panes from AppleScript the way claudegrid does."
date: 2026-11-28
faq:
  - q: "What is the iTerm2 shortcut to split a pane?"
    a: "Cmd-D splits vertically, putting the new pane to the right. Cmd-Shift-D splits horizontally, putting the new pane below. Both use the current session's profile."
  - q: "How do I make iTerm2 split panes open in the same directory?"
    a: "In Settings, Profiles, General, Working Directory, choose Advanced Configuration and set Working Directory for New Split Panes to Reuse previous session's directory."
  - q: "How do I move between split panes in iTerm2?"
    a: "Cmd-Option and an arrow key selects the pane in that direction, and Cmd-] moves to the next pane. Cmd-Shift-Enter maximizes the active pane and restores it."
  - q: "Can I script iTerm2 split panes?"
    a: "Yes, with AppleScript: tell a session to split vertically or horizontally with a profile, optionally with a command to run in the new pane. macOS asks once for Automation permission."
---

# Splitting iTerm2 panes by hand and from AppleScript

<p class="post-meta">Halit Sever · 28 November 2026</p>

iTerm2 can split a tab into as many panes as you like, each running its own shell. This post lists the shortcuts, the setting that keeps new panes in the same folder, and how to build a layout from AppleScript, which is how [claudegrid](/) opens a grid of Claude Code agents in iTerm2. Shortcuts were read from iTerm2's main menu definition in its source repository on 28 November 2026; you can see them in the Shell, View and Window menus.

## Shortcuts

| Shortcut | Menu item | Result |
| --- | --- | --- |
| `Cmd-D` | Shell > Split Vertically with Current Profile | new pane to the right |
| `Cmd-Shift-D` | Shell > Split Horizontally with Current Profile | new pane below |
| `Cmd-Option-Shift-V` | Shell > Split Vertically… | pick a profile, then split |
| `Cmd-Option-Shift-H` | Shell > Split Horizontally… | pick a profile, then split |
| `Cmd-Option` + arrow | Window > Split Pane > Select Split Pane | move to the pane in that direction |
| `Cmd-]` / `Cmd-[` | next / previous pane | cycle through panes |
| `Cmd-Shift-Enter` | View > Maximize Active Pane | fill the tab with one pane, press again to restore |

As in tmux, "vertical" names the dividing line: a vertical split puts panes side by side. Drag the line between panes to resize them.

## Split panes in the same directory

By default a new pane starts in your home folder. To open it where the current pane is:

1. Open **Settings > Profiles > General**.
2. Under **Working Directory**, choose **Advanced Configuration** and click **Edit**.
3. Set **Working Directory for New Split Panes** to **Reuse previous session's directory**.

The same dialog has separate choices for new windows and new tabs, so you can keep those starting at home. 

## Type in every pane at once

**Shell > Broadcast Input** sends what you type to more than one session: all panes in the current tab, or all panes in all tabs of the window. iTerm2's documentation adds a short warning: "Be careful." It is useful for running the same command on several servers, and easy to forget it is on.

## Opening split panes from a script

iTerm2 has an AppleScript dictionary. This opens a new window and splits it into two columns and two rows, each pane running a command:

```applescript
tell application "iTerm"
  activate
  set w to (create window with default profile)
  set s1 to current session of w
  tell s1 to set s2 to (split vertically with default profile command "htop")
  tell s1 to set s3 to (split horizontally with default profile)
  tell s2 to set s4 to (split horizontally with default profile)
  tell s3 to write text "cd ~/code/app && git status"
end tell
```

Run it with `osascript grid.applescript`. Notes:

- `split vertically` puts the new session to the right, `split horizontally` below.
- With `command "…"` the new pane runs that program instead of your login shell, and closes when it exits. Without it, you get a shell and can send it a line with `write text`.
- The first time a script controls iTerm2, macOS asks whether your terminal may control it. If you declined, allow it under **System Settings > Privacy & Security > Automation**.

## Why iTerm2 grids come out uneven

iTerm2 can only split a pane in half. Grids with 1, 2 or 4 columns or rows come out exact. Three columns do not: split once and you have 50/50, split one half again and you have 50/25/25. Resizing panes from AppleScript to fix that is fiddly.

## How claudegrid does it

On macOS, `claudegrid -b iterm2` builds the grid with exactly this kind of AppleScript. It opens a window, or a new tab when you already run it inside iTerm2, splits in a column-first order, and starts each pane with a one-line command that runs `claudegrid pane` for that pane, so prompts never need shell quoting. Each pane is named after its pane in the config. See every line it would run with:

```sh
claudegrid -b iterm2 -l 2x2 --dry-run
```

Because of the halving limit, claudegrid's docs recommend tmux inside iTerm2 when you need three even columns:

```sh
claudegrid -b tmux -l 3x2
```

tmux splits by percentage, so the columns stay even. [Terminals](/guide/terminals) compares the backends.

## FAQ

<Faq />

## Related

- [tmux split panes](/blog/tmux-split-panes): even grids with percentages
- [tmux detach](/blog/tmux-detach): keep a grid running in the background
- [Terminals](/guide/terminals): claudegrid's iTerm2, Terminal.app, kitty and WezTerm backends
- [Claude Code worktrees](/claude-code-worktree): one branch per pane
