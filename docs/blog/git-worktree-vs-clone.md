---
title: "Git Worktree vs Multiple Clones vs Branches"
titleTemplate: false
description: "Git worktree vs a second clone vs switching branches: disk use, shared history, hooks and config, and when a separate clone is still the better choice."
date: 2026-11-28
faq:
  - q: "Is a git worktree better than cloning the repository twice?"
    a: "For working on two branches of one repository, usually yes: a worktree shares the history and branches with the main checkout, so it costs only the checked-out files and needs no fetch or push between copies."
  - q: "When should I use a separate clone instead of a worktree?"
    a: "When you want full isolation: different config or hooks, a different remote, experiments that rewrite history, or a repository with submodules, where git's own manual calls worktree support incomplete."
  - q: "What is the difference between git branch and git worktree?"
    a: "A branch is a pointer to a commit. A worktree is a folder with a branch checked out. You switch branches inside one folder, while worktrees give each branch its own folder at the same time."
  - q: "Do worktrees share git hooks?"
    a: "Yes. Linked worktrees use the main repository's .git directory, so hooks in .git/hooks and the repository config apply to all of them."
---

# Git worktree vs multiple clones vs branches

<p class="post-meta">Halit Sever · 28 November 2026</p>

You need two versions of the same project open at once: a feature in progress and an urgent fix, or two coding agents working side by side. There are three ways to get there: switch branches in one folder, clone the repository a second time, or add a git worktree. They differ in disk use, in what they share, and in how much can go wrong.

## The short version

| | Switch branches | Second clone | Worktree |
| --- | --- | --- | --- |
| Folders | one | one per clone | one per worktree |
| Two branches open at once | no | yes | yes |
| History on disk | once | once per clone | once |
| Branches and commits shared | yes | no, through a remote | yes, instantly |
| Hooks and config shared | yes | no | yes |
| Same branch in two places | n/a | yes | no, git refuses |
| Untracked files (`.env`, `node_modules`) | shared | separate | separate |

## Switching branches

`git switch other-branch` changes the files in your one folder. It is the right tool when you work on one thing at a time. It gets in the way when work is half done: you stash or commit a work-in-progress, switch, and switch back, and build caches and dev servers see every file change. Two things can never run at once.

## A second clone

```sh
git clone https://github.com/me/app.git app-2
```

A clone is a complete, independent repository. That is its strength and its cost:

- **Disk**: the history is stored twice. For claudegrid's own repository, measured on 28 November 2026, a fresh clone was 1.6 MB of `.git` plus 1.2 MB of files. A local clone from a path hardlinks the object files when it can, which saves space on the same filesystem.
- **Sync**: a commit in one clone is invisible to the other until you push and fetch.
- **Isolation**: each clone has its own config, hooks, remotes and branches. Nothing you do in one can affect the other.

## A worktree

```sh
git worktree add -b fix ../app-fix
```

A worktree is a second folder attached to the same repository:

- **Disk**: only the checked-out files. For the same repository, the worktree was 1.2 MB of files and a 4 KB `.git` file pointing back to the main repository.
- **Sync**: none needed. A commit in one worktree is visible in all of them immediately.
- **Shared state**: hooks, config, remotes and branches are shared. The checked-out files, the index and `HEAD` are per worktree.
- **One rule**: a branch can be checked out in only one worktree at a time.

## When a clone is still the better choice

Worktrees are not always the answer. Use a separate clone when:

- **You want different config or hooks** for the second copy, since worktrees share them.
- **You are about to rewrite history**, run aggressive `gc`, or try anything that could damage the repository. A clone keeps the damage in one place.
- **The project uses submodules.** The `git-worktree` manual says it plainly: "the support for submodules is incomplete. It is NOT recommended to make multiple checkouts of a superproject."
- **The copy belongs to something else**, such as a CI cache or a container image, that should not depend on your local `.git`.

## When a worktree wins

- Two or more branches open at once, for a long time, on one machine.
- You want commits from one to be usable in the other without push and fetch.
- You create and throw away copies often. `git worktree add` and `git worktree remove` are fast and leave no remote to tidy.

## Several coding agents at once

Parallel AI agents are the clearest case for worktrees. Each agent needs its own files, so they do not overwrite each other, but you want all their work as branches in one repository so you can diff and merge it.

[claudegrid](/) does this for Claude Code: `claudegrid -w -n 4` creates four worktrees next to your repository, one branch each, and opens a Claude Code session in every pane. When they are done:

```sh
git diff main...claudegrid/grid/pane-2
git merge claudegrid/grid/pane-2
claudegrid worktrees clean
```

No clones to keep in sync and no remote to push through. [Claude Code worktrees](/claude-code-worktree) covers the setup.

## FAQ

<Faq />

## Related

- [What is a git worktree?](/blog/what-is-a-git-worktree): main and linked worktrees
- [git worktree add](/blog/git-worktree-add): every way to create one
- [git worktree remove, prune and cleanup](/blog/git-worktree-remove): getting rid of them
- [The --worktrees option](/guide/worktrees): claudegrid's reference
