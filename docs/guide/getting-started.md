---
title: Getting started
description: Install claudegrid with npm or a one line script, check your setup with claudegrid doctor and open your first grid of Claude Code sessions.
---

# Getting started

claudegrid opens several [Claude Code](https://claude.com/claude-code) sessions in one terminal window, laid out as a grid. Each pane can work on its own task, with its own model and, if you want, on its own git branch.

<img src="/demo.svg" alt="four Claude Code panes opened by claudegrid" width="960" height="560" />

## Requirements

- **Node.js 20** or newer
- **Claude Code**, with `claude` on your `PATH`
- One of these terminals:
  - **KDE Konsole** with `qdbus6`
  - **tmux** 3.1 or newer, which works inside any terminal and over SSH
  - **kitty**
  - **WezTerm**

## Install

::: code-group

```sh [npm]
npm install -g claudegrid
```

```sh [script]
curl -fsSL https://raw.githubusercontent.com/halitsever/claudegrid/main/install.sh | bash
```

```sh [from source]
git clone https://github.com/halitsever/claudegrid.git
cd claudegrid
./install.sh
```

:::

The install script uses npm under the hood. When your global npm folder needs root, it installs into `~/.local` instead. It also removes the first, bash-only version of claudegrid if it finds one.

## Check your setup

```sh
claudegrid doctor
```

```txt
▦ claudegrid doctor

requirements
  ✔ node             v22.22.1
  ✔ claude           2.1.325 (Claude Code)
  ✔ git              git version 2.53.0

terminals
  ✔ konsole          konsole + qdbus6 (you are in it)
  ✔ tmux             tmux 3.6
  • kitty            kitty is not installed
  • wezterm          wezterm is not installed
  → auto picks       konsole
```

## Your first grid

```sh
cd ~/my-project
claudegrid
```

This opens four panes running `claude` in `~/my-project`. To see what would happen without opening anything, add `--dry-run`.

## Shell completion

::: code-group

```sh [bash]
claudegrid completion bash > ~/.local/share/bash-completion/completions/claudegrid
```

```sh [zsh]
claudegrid completion zsh > "${fpath[1]}/_claudegrid"
```

```sh [fish]
claudegrid completion fish > ~/.config/fish/completions/claudegrid.fish
```

:::

Completion also suggests the preset names from your config.

## Uninstall

```sh
npm uninstall -g claudegrid
```

Next: [Usage](./usage)
