---
title: Configuration
description: Configure claudegrid with a .claudegrid.json project file or a user config. Set layouts, per-pane names, prompts, models, directories and Claude Code flags.
---

# Configuration

claudegrid reads two optional JSON files:

| File | Scope |
| --- | --- |
| `~/.config/claudegrid/config.json` | your defaults on this machine |
| `.claudegrid.json` (or `claudegrid.json`) | the project. claudegrid looks in the current directory and every parent |

Run `claudegrid init` to create a project config with examples. Use `-c <file>` to point at another file.

## Example

```json
{
  "$schema": "https://halitsever.github.io/claudegrid/schema.json",
  "model": "sonnet",
  "args": ["--permission-mode", "acceptEdits"],
  "panes": [
    { "name": "api", "dir": "server", "prompt": "Add rate limiting to the public endpoints" },
    { "name": "web", "dir": "web" },
    { "name": "tests", "prompt": "Run the test suite and fix whatever fails" },
    { "name": "review", "model": "opus", "prompt": "Review the uncommitted changes" }
  ]
}
```

The `$schema` line gives you autocomplete and checks in VS Code, JetBrains IDEs and any editor with a JSON language server.

## Grid options

| Key | Type | Default | What it does |
| --- | --- | --- | --- |
| `layout` | string | `"2x2"` | `COLSxROWS` or a pane count. Wins over a numeric `panes` |
| `panes` | number or array | 4 | how many panes, or one entry per pane |
| `model` | string | | `--model` for every pane |
| `args` | string[] | | extra Claude Code flags for every pane |
| `worktrees` | boolean | `false` | one [git worktree](./worktrees) per pane |
| `backend` | string | `"auto"` | `auto`, `konsole`, `tmux`, `kitty` or `wezterm` |
| `command` | string | `"claude"` | program each pane runs |
| `keepShell` | boolean | `true` | open your shell when the program exits |
| `dir` | string | | base directory for every pane, relative to the config file |

## Pane options

Each entry in `panes` is either an object or a string. A string is shorthand for `{ "prompt": "..." }`.

| Key | What it does |
| --- | --- |
| `name` | title of the pane, and its branch name with worktrees. Must be unique |
| `prompt` | first message sent to Claude |
| `model` | overrides the grid `model` |
| `args` | Claude Code flags for this pane only |
| `dir` | working directory, relative to the config file |

## How settings combine

From lowest to highest priority:

1. user config
2. project config
3. the [preset](./presets) you picked
4. command line flags

A later layer replaces a value from an earlier one. `args` is the exception: the args from every layer are added together, so a preset can add flags without repeating the project's.

Each pane's command line is built in this order:

```txt
claude <args> --model <model> <pane args> <flags after --> <prompt>
```

## Mistakes are caught early

claudegrid checks the whole config before it opens anything, and it points at the exact key:

```txt
error: /home/you/app/.claudegrid.json: panes[1] has an unknown key "promt"
hint: did you mean "prompt"?
```
