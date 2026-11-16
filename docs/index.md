---
layout: home
title: Run 4 Claude Code agents side by side
description: claudegrid opens a KDE Konsole window split 2x2 with Claude Code running in every pane. One command, four AI coding sessions in the same project.

hero:
  name: claudegrid
  text: Four Claude Code sessions, one command
  tagline: Open a KDE Konsole window split 2x2 with claude running in every pane.
  image:
    src: /logo.svg
    alt: claudegrid logo
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/halitsever/claudegrid

features:
  - icon: 🪟
    title: One command, four agents
    details: Type claudegrid and a new Konsole window opens with four Claude Code panes ready to work in parallel.
  - icon: 📁
    title: Starts where you are
    details: Every pane opens in the directory you ran claudegrid from, so all four agents see the same project.
  - icon: 🎛️
    title: Shared flags
    details: Extra arguments go to each claude, so claudegrid --continue or --model works in every pane at once.
  - icon: 🐚
    title: Your shell stays
    details: When a claude session ends, the pane drops into your shell instead of closing.
---
