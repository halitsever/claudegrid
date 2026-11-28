---
title: The --worktrees option
description: Reference for claudegrid's --worktrees option and the worktrees key. Where each pane's checkout goes, how branches are named, and how to list and clean them.
---

# The --worktrees option: a branch for each pane

For what worktrees do for Claude Code agents and when to use them, see [Claude Code worktrees](/claude-code-worktree). This page is the reference for the option itself.

Several agents editing the same checkout will overwrite each other. With worktrees on, each pane gets its own checkout of the repo on its own branch:

```sh
claudegrid --worktrees
claudegrid -w -n 3 -p "approach A" -p "approach B" -p "approach C"
```

or in a config:

```json
{ "worktrees": true }
```

## Where they go

Worktrees are created next to the repo, never inside it:

```txt
~/code/app/                          your checkout
~/code/app.claudegrid/grid-pane-1/   branch claudegrid/grid/pane-1
~/code/app.claudegrid/grid-pane-2/   branch claudegrid/grid/pane-2
```

Branch names come from the preset (or `grid`) and the pane name. With a preset `feature` and a pane named `api`, the branch is `claudegrid/feature/api`.

New branches start from your current `HEAD`. When you open the same grid again, claudegrid reuses the existing worktrees, so every agent continues where it left off.

A pane `dir` such as `web` maps into the worktree too, so that pane starts in `app.claudegrid/grid-web/web`.

## Review and merge

They are ordinary git branches:

```sh
git log main..claudegrid/grid/pane-2
git diff main...claudegrid/grid/pane-2
git merge claudegrid/grid/pane-2
```

## List and clean

```sh
claudegrid worktrees
```

```txt
claudegrid/grid/pane-1  clean, 3 commits ahead
                        ~/code/app.claudegrid/grid-pane-1
claudegrid/grid/pane-2  2 changed
                        ~/code/app.claudegrid/grid-pane-2
```

```sh
claudegrid worktrees clean             # remove clean worktrees and merged branches
claudegrid worktrees clean --dry-run   # show what would go
claudegrid worktrees clean --force     # also drop uncommitted changes and unmerged branches
claudegrid worktrees clean --keep-branches
```

Without `--force`, cleaning never throws work away. Worktrees with uncommitted changes are skipped, and branches with unmerged commits are kept.
