---
title: Presets
description: Save named claudegrid setups, such as a review team or a swarm of agents on separate worktrees, and start them with one word.
---

# Presets

A preset is a named set of grid options. Start one by passing its name:

```sh
claudegrid review
```

Presets live under `presets` in the project or user config. They accept every [grid option](./configuration#grid-options), plus a `description`:

```json
{
  "$schema": "https://halitsever.github.io/claudegrid/schema.json",
  "presets": {
    "review": {
      "description": "Three reviewers with different focus",
      "model": "opus",
      "panes": [
        { "name": "bugs", "prompt": "Review the diff against main for bugs" },
        { "name": "security", "prompt": "Review the diff against main for security problems" },
        { "name": "tests", "prompt": "List behavior in the diff that has no test" }
      ]
    },
    "swarm": {
      "description": "Six agents, each on its own branch",
      "panes": 6,
      "worktrees": true
    },
    "duo": {
      "panes": [{ "name": "left" }, { "name": "right" }]
    }
  }
}
```

```sh
claudegrid presets
```

```txt
duo      (project)
review   Three reviewers with different focus (project)
swarm    Six agents, each on its own branch (project)
```

A preset is applied on top of the project settings, so it only needs the keys it changes. Flags still win, so `claudegrid review -m sonnet` runs the review team on Sonnet.

When the project and user config both define a preset with the same name, the project's version is used.

## Ideas

- **feature**: frontend, backend and tests panes, each in its own `dir`
- **review**: several reviewers on Opus with different prompts
- **swarm**: the same task given to several agents on worktrees, then you keep the best result
- **explore**: `"args": ["--permission-mode", "plan"]` for read-only investigation
