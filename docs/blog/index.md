---
title: "claudegrid Blog: tmux, Git Worktrees and Terminal Grids"
titleTemplate: false
description: "Guides on tmux keys, sessions, panes and config, git worktrees and terminal grids, written from claudegrid's code and the tmux and git documentation."
---

# claudegrid blog

Notes on the tools under [claudegrid](/): tmux, git worktrees and the terminals it drives. New to tmux? The [tmux cheat sheet](./tmux-cheat-sheet) has every default key on one page. Each post is written from claudegrid's source and the official tmux, git, kitty and iTerm2 documentation. For running several Claude Code agents on separate branches, start with [Claude Code worktrees](/claude-code-worktree).

<ul class="post-list">
  <li>
    <a href="./tmux-detach">tmux detach: leave a session running and come back</a>
    <p>Ctrl-b d, detaching from outside, kicking other clients, and attaching again.</p>
  </li>
  <li>
    <a href="./tmux-split-panes">tmux split panes: vertical, horizontal and grids</a>
    <p>The split keys, split-window sizes in percent, layouts and an exact grid.</p>
  </li>
  <li>
    <a href="./git-worktree-add">git worktree add: work on two branches at once</a>
    <p>New branches, existing branches, remote branches and detached HEADs.</p>
  </li>
  <li>
    <a href="./what-is-a-git-worktree">What is a git worktree?</a>
    <p>Main and linked worktrees, what they share, and why they suit coding agents.</p>
  </li>
  <li>
    <a href="./git-worktree-remove">git worktree remove, prune and cleanup</a>
    <p>Dirty and locked worktrees, prune for deleted folders, and the branch left behind.</p>
  </li>
  <li>
    <a href="./xterm-kitty-unknown-terminal-type">Fix "'xterm-kitty': unknown terminal type" over SSH</a>
    <p>Why kitty's TERM breaks programs on servers, and four ways to fix it.</p>
  </li>
  <li>
    <a href="./git-worktree-vs-clone">Git worktree vs multiple clones vs branches</a>
    <p>Disk use, shared state, and when a second clone is still the better choice.</p>
  </li>
  <li>
    <a href="./iterm2-split-pane">iTerm2 split panes and opening them from a script</a>
    <p>Shortcuts, same-directory panes, broadcast input and AppleScript layouts.</p>
  </li>
  <li>
    <a href="./tmux-cheat-sheet">tmux cheat sheet: keys and commands for tmux 3.6</a>
    <p>Every default key for sessions, windows, panes, layouts and copy mode.</p>
  </li>
  <li>
    <a href="./tmux-scroll-up">tmux scroll up: copy mode, mouse and history</a>
    <p>PageUp, mouse wheel scrolling, searching back and a bigger history limit.</p>
  </li>
  <li>
    <a href="./tmux-kill-session">tmux kill session: one, all others or every session</a>
    <p>kill-session, kill-server, windows and panes, and what happens to programs.</p>
  </li>
  <li>
    <a href="./tmux-vs-screen">tmux vs screen: differences, keys and when to use each</a>
    <p>Prefix keys, splits, sessions, scripting and serial ports, from both manuals.</p>
  </li>
  <li>
    <a href="./tmux-config">tmux config file: location, examples and reload</a>
    <p>Where tmux.conf lives, a tested starting config and source-file.</p>
  </li>
  <li>
    <a href="./tmux-rename-window">tmux rename window and session</a>
    <p>Ctrl-b , and Ctrl-b $, and why automatic-rename changes names back.</p>
  </li>
</ul>
