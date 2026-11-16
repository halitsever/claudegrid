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
- Linux or macOS
- One of these terminals:
  - **KDE Konsole** with `qdbus6` (Linux)
  - **iTerm2** (macOS)
  - **tmux** 3.1 or newer, which works inside any terminal and over SSH
  - **kitty**
  - **WezTerm**

## Install

::: code-group

```sh [npm]
npm install -g @halitsever/claudegrid
```

```sh [Debian / Ubuntu]
curl -fLO https://github.com/halitsever/claudegrid/releases/latest/download/claudegrid.deb
sudo apt install ./claudegrid.deb
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

The `.deb` package needs Node.js 20 or newer from your distro (Ubuntu 25.04 and later, Debian 13) or from [NodeSource](https://github.com/nodesource/distributions). It adds shell completion for bash, zsh and fish and puts claudegrid in your app menu.

The install script uses npm under the hood. When your global npm folder needs root, it installs into `~/.local` instead. It also removes the first, bash-only version of claudegrid if it finds one.

### macOS

Install Node.js and Claude Code, for example with [Homebrew](https://brew.sh), then claudegrid with npm or the install script:

```sh
brew install node tmux
npm install -g @anthropic-ai/claude-code @halitsever/claudegrid
```

On a Mac, claudegrid uses iTerm2 when you run it there, and kitty, WezTerm or tmux otherwise. Terminal.app cannot split panes, so from Terminal.app claudegrid opens iTerm2, kitty or WezTerm when one is installed, and a tmux session in Terminal.app otherwise. The first time claudegrid drives iTerm2, macOS asks whether your terminal may control iTerm2. Allow it, or later in **System Settings → Privacy & Security → Automation**.

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
npm uninstall -g @halitsever/claudegrid   # npm or the install script
sudo apt remove claudegrid                # .deb
```

Next: [Usage](./usage)
