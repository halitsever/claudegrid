---
layout: home
title: Run several Claude Code agents side by side
description: claudegrid opens a grid of Claude Code sessions in Konsole, tmux, kitty or WezTerm, with a prompt, model and git worktree per pane.

hero:
  name: claudegrid
  text: A grid of Claude Code agents, one command
  tagline: Open 2 to 16 Claude Code sessions side by side in Konsole, tmux, kitty or WezTerm. Give each one its own task, model and git branch.
  image:
    src: /logo.svg
    alt: claudegrid logo
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Configuration
      link: /guide/configuration
    - theme: alt
      text: GitHub
      link: https://github.com/halitsever/claudegrid

features:
  - icon: 🪟
    title: Any grid
    details: 2x2 by default, or 3x2, 1x3, or just a pane count. Panes come out evenly sized in every terminal.
  - icon: 🎯
    title: A task per pane
    details: "claudegrid -p \"fix lint\" -p \"write tests\" starts each pane on its own prompt, with its own model and flags if you want."
  - icon: 🌿
    title: Git worktrees
    details: With --worktrees every agent works on its own branch in its own checkout, so four agents never edit the same files.
  - icon: 🧩
    title: Presets
    details: Save layouts and teams of agents in .claudegrid.json and start them with claudegrid review or claudegrid swarm.
  - icon: 🖥️
    title: Four terminals
    details: KDE Konsole, tmux, kitty and WezTerm. claudegrid uses the one you are in, or the best one installed.
  - icon: 🩺
    title: Safe to try
    details: --dry-run prints every command first, doctor checks your setup, and config mistakes come with a "did you mean".
---

<div class="cg-demo">
  <img src="/demo.svg" alt="claudegrid typing a command and four Claude Code panes opening, each working on its own task" width="960" height="560" />
</div>
