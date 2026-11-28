---
title: "What Is a Git Worktree? A Plain Explanation"
titleTemplate: false
description: "What a git worktree is, how it differs from a branch and a clone, what it shares with the main checkout, and why it suits running several coding agents at once."
date: 2026-11-28
faq:
  - q: "What is a worktree in git?"
    a: "A worktree is a folder with a checkout of your repository. Every repository has one main worktree, and git worktree add creates more linked worktrees that share the same history, branches and remotes."
  - q: "Is a git worktree the same as a branch?"
    a: "No. A branch is a pointer to a commit. A worktree is a folder where a branch is checked out. Worktrees let you have several branches checked out at the same time, each in its own folder."
  - q: "Do git worktrees take a lot of disk space?"
    a: "Each worktree holds its own copy of the checked-out files, but not of the history. The objects live once, in the main repository's .git directory."
  - q: "Can two worktrees use the same branch?"
    a: "Not by default. Git refuses to check out a branch that is already checked out in another worktree, so two folders never move the same branch under each other."
---

# What is a git worktree?

<p class="post-meta">Halit Sever · 28 November 2026</p>

A git worktree is a folder where your repository is checked out. You already have one: the folder you cloned into. `git worktree` lets you add more, each with a different branch checked out, all attached to the same repository. The `git-worktree` manual puts it this way: a repository "can support multiple working trees, allowing you to check out more than one branch at a time."

## Main and linked worktrees

- The **main worktree** is the one `git clone` or `git init` made. It holds the real `.git` directory.
- A **linked worktree** is one you add with `git worktree add`. Its `.git` is a small file pointing back into the main repository, at `.git/worktrees/<name>`.

```sh
cd ~/code/app
git worktree add -b hotfix ../app-hotfix
git worktree list
```

```txt
/home/me/code/app          72c48cd [main]
/home/me/code/app-hotfix   72c48cd [hotfix]
```

Now `~/code/app` has `main` checked out and `~/code/app-hotfix` has `hotfix`. You can edit, build and test in both at once.

## What is shared and what is not

| Shared by all worktrees | Separate per worktree |
| --- | --- |
| Commits and other objects | The checked-out files |
| Branches and tags | `HEAD`, which branch is checked out |
| Remotes and fetched refs | The index (staging area) |
| Repository config | Untracked and ignored files |

So a commit made in `app-hotfix` is instantly visible from `app`: `git log hotfix` works there without any fetch. But `git add` in one folder does not stage anything in the other, and `node_modules` installed in one is not there in the other.

## Worktree vs branch vs clone

People mix these up, so in one line each:

- A **branch** is a name that points to a commit. It does not have files of its own.
- A **worktree** is a folder where one branch is checked out. Several worktrees mean several branches checked out at once.
- A **clone** is a whole second repository, with its own copy of the history and its own branches, which you sync through a remote.

Without worktrees, switching from a half-done feature to an urgent fix means stash, switch, fix, switch back, unstash. With a worktree you leave the feature as it is and open the fix in another folder. [Git worktree vs clone vs branch](/blog/git-worktree-vs-clone) compares them in more detail.

## One rule to know

A branch can be checked out in only one worktree at a time. Git stops you:

```txt
fatal: 'main' is already used by worktree at '/home/me/code/app'
```

That rule is the point. Two folders on one branch would move the branch under each other on every commit.

## Why worktrees suit coding agents

An AI coding agent edits files. Two agents in one folder edit the same files, so their changes collide and the tests one agent runs pick up the other's half-finished work. Giving each agent its own worktree gives it its own files and its own branch, while all of them share one history, so comparing and merging their work is plain git.

Claude Code supports this directly: `claude --worktree <name>` starts a session in a new worktree under `.claude/worktrees/`. [claudegrid](/) does it for a whole grid: `claudegrid -w -n 3` creates three worktrees next to the repository, on branches `claudegrid/grid/pane-1` to `pane-3`, and opens a Claude Code session in each. [Claude Code worktrees](/claude-code-worktree) compares the two.

## The life cycle in four commands

```sh
git worktree add -b feature ../app-feature   # create
git worktree list                            # see them all
git worktree remove ../app-feature           # remove a clean one
git worktree prune                           # forget folders deleted by hand
```

[git worktree add](/blog/git-worktree-add) and [git worktree remove and prune](/blog/git-worktree-remove) cover each step.

## FAQ

<Faq />

## Related

- [git worktree add](/blog/git-worktree-add): new branches, existing branches, detached HEAD
- [git worktree remove, prune and cleanup](/blog/git-worktree-remove): removing them safely
- [Claude Code worktrees](/claude-code-worktree): one branch per agent
- [The --worktrees option](/guide/worktrees): claudegrid's reference
