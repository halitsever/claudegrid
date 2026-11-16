# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `claudegrid update` installs the latest version from npm, `--check` only reports it

## [1.4.0] - 2026-11-16

### Added

- A Terminal.app backend for macOS, `-b terminal`, that opens one tiled window per pane. `auto` falls back to it when no other terminal works, so claudegrid runs on a stock Mac
- Pane folders are marked as trusted in Claude Code, so the panes skip its trust question. `--no-trust` or `"trust": false` brings the question back
- A "Supported terminals" table in the Readme

### Fixed

- iTerm2 counts as installed when claudegrid runs inside it, even outside `/Applications`

## [1.3.1] - 2026-11-16

### Changed

- The Readme feature list no longer uses emoji

## [1.3.0] - 2026-11-16

### Changed

- The npm package is now `@halitsever/claudegrid`, because npm does not allow the plain name. The command is still `claudegrid`. `install.sh` removes an older plain `claudegrid` install first

### Added

- macOS support: an iTerm2 backend that opens the grid as a tab or window over AppleScript, kitty and WezTerm found inside their app bundles, `claudegrid ui` as a Chrome, Brave, Edge or Arc app window, and `claudegrid desktop install` creating `~/Applications/claudegrid.app`
- `--dry-run` and `--json` can preview a terminal that is not installed
- CI runs the tests on macOS too

### Fixed

- `install.sh` works with the bash 3.2 that ships with macOS

## [1.2.0] - 2026-11-16

### Added

- Run from inside Konsole, WezTerm or tmux, the grid now opens as a new tab in that terminal. `--no-new-tab` or `"newTab": false` opens a separate window as before
- A `claudegrid` Konsole profile, added on the first run and shipped in the `.deb` and AUR packages, so Konsole tabs can run panes

## [1.1.0] - 2026-11-16

### Added

- `claudegrid ui`: a desktop app in its own window. Pick a project, set the layout, model, terminal and worktrees, give every pane a name, prompt, model and folder, preview the commands and launch. It also saves project defaults and presets, manages worktrees and shows the doctor checks
- `claudegrid desktop install` and `uninstall` to add the app to your application menu
- A `.deb` package on every release, with completions and an app menu entry
- The app server listens on 127.0.0.1 only, needs a random token on every request and refuses other hosts and origins

### Changed

- `--json` output also lists the grid's `columns`

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
