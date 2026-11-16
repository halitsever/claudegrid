# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-16

claudegrid is now a Node.js CLI instead of a single bash script.

### Added

- Any layout: `--layout 3x2`, `1x3`, or a pane count with `-n`, up to 16 panes, evenly sized
- A prompt per pane with repeated `-p`, plus `--model` and Claude Code flags after `--`
- `.claudegrid.json` project config and `~/.config/claudegrid/config.json` user config, with pane names, prompts, models, args and directories, and a JSON Schema for editor autocomplete
- Presets started with `claudegrid <name>`, listed with `claudegrid presets`
- Git worktrees with `--worktrees`: one branch and checkout per pane, reused on the next run, and `claudegrid worktrees` / `worktrees clean` to manage them
- tmux, kitty and WezTerm backends next to Konsole, picked automatically
- `claudegrid init`, `claudegrid doctor`, `--dry-run`, `--json`
- Shell completion for bash, zsh and fish, including preset names
- Install script with fallback to `~/.local`, AUR `PKGBUILD`, CI and release workflows

### Changed

- Konsole grids no longer need a profile in `~/.local/share/konsole`. A temporary profile copies your default one
- Claude Code flags go after `--`: `claudegrid -- --continue`

## [0.1.0] - 2026-11-16

- First version: a bash script that opens a 2x2 Konsole window with `claude` in every pane
