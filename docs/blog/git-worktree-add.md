---
title: "git worktree add: Work on Two Branches at Once"
titleTemplate: false
description: "How git worktree add works: create a worktree on a new or existing branch, track a remote branch, use a detached HEAD, and fix 'already used by worktree'."
date: 2026-11-28
faq:
  - q: "How do I create a git worktree for a new branch?"
    a: "Run git worktree add -b <branch> <path>. The branch starts at HEAD unless you pass a starting commit after the path, for example git worktree add -b fix ../app-fix origin/main."
  - q: "How do I create a worktree for an existing branch?"
    a: "Run git worktree add <path> <branch>. Git refuses if that branch is already checked out in another worktree, since one branch can only be checked out once."
  - q: "What does git worktree add do without a branch name?"
    a: "git worktree add ../hotfix creates a new branch named after the last part of the path, hotfix, starting at HEAD, and checks it out in ../hotfix."
  - q: "Where should I put worktrees?"
    a: "Anywhere outside the main working tree is simplest, usually a sibling folder such as ../app-hotfix. Inside the repository they show up as untracked files unless you ignore them."
---

# git worktree add: check out a second branch in its own folder

<p class="post-meta">Halit Sever · 28 November 2026</p>

`git worktree add` checks out a branch into a second folder, linked to the same repository. You can build a hotfix in one folder while a feature branch sits untouched in another, with no stashing and no second clone. The commands and error messages below were run with git 2.53 and match the `git-worktree` manual page.

## The syntax

```txt
git worktree add [-f] [--detach] [--checkout] [--lock [--reason <string>]]
                 [--orphan] [(-b | -B) <new-branch>] <path> [<commit-ish>]
```

The path comes first, then what to check out. The common cases follow.

## A new branch

```sh
git worktree add -b feature/login ../app-login
```

```txt
Preparing worktree (new branch 'feature/login')
HEAD is now at 72c48cd init
```

`-b` creates the branch, starting from `HEAD`. To start it somewhere else, add the starting point after the path:

```sh
git worktree add -b hotfix/crash ../app-hotfix origin/main
```

`-b` refuses to overwrite a branch that already exists. `-B` resets it to the starting point instead, so use it with care.

## The shortcut: let the path name the branch

With no branch and no `-b`, git uses the last part of the path:

```sh
git worktree add ../hotfix
```

This creates a branch `hotfix` from `HEAD` and checks it out in `../hotfix`. If a branch `hotfix` already exists and is not checked out anywhere, git uses it instead of creating one.

## An existing branch

```sh
git worktree add ../app-review review/payments
```

If `review/payments` only exists on a remote, say `origin/review/payments`, and in exactly one remote, git creates a local branch that tracks it, as if you had run:

```sh
git worktree add --track -b review/payments ../app-review origin/review/payments
```

## "already used by worktree"

One branch can be checked out in one place at a time. Try to add `main` while it is checked out in your main folder:

```sh
git worktree add ../x main
```

```txt
fatal: 'main' is already used by worktree at '/home/me/code/app'
```

Use a new branch instead (`-b`), or a detached HEAD (below). `--force` overrides the check, but two folders on one branch is rarely what you want, since a commit in one moves the branch under the other.

## A detached HEAD for throwaway work

```sh
git worktree add -d ../app-test
```

`-d` (`--detach`) checks out the current commit without any branch. It is good for running tests on an old commit or trying something you will throw away.

## Checking the result

```sh
git worktree list
```

```txt
/home/me/code/app          72c48cd [main]
/home/me/code/app-login    72c48cd [feature/login]
/home/me/code/app-hotfix   72c48cd [hotfix/crash]
```

In `git branch`, branches checked out in another worktree are marked with `+`.

The new folder has a `.git` file instead of a `.git` directory. It points back to the main repository:

```txt
gitdir: /home/me/code/app/.git/worktrees/app-login
```

All objects, branches and remotes live in the main repository. A commit in one worktree is visible from every other one at once.

## What a new worktree does not have

A worktree is a fresh checkout of tracked files. Anything gitignored is missing: `node_modules`, build output, `.env` files. Install dependencies and copy local config into each new worktree before you run anything there.

## Where claudegrid puts them

[claudegrid](/) opens a grid of Claude Code agents, and with `-w` it runs `git worktree add` once per pane:

```sh
claudegrid -w -n 3
```

The worktrees go next to the repository, in `<repo>.claudegrid/`, on branches named `claudegrid/<group>/<pane>`:

```txt
~/code/app/                          your checkout
~/code/app.claudegrid/grid-pane-1/   branch claudegrid/grid/pane-1
~/code/app.claudegrid/grid-pane-2/   branch claudegrid/grid/pane-2
```

New branches start from your current `HEAD`. If the branch already exists, claudegrid checks it out instead of creating it, and when you open the same grid again it reuses the worktrees. `--dry-run` prints each `git worktree add` it would run. More in [Claude Code worktrees](/claude-code-worktree).

## FAQ

<Faq />

## Related

- [What is a git worktree?](/blog/what-is-a-git-worktree): the idea behind it
- [git worktree remove, prune and cleanup](/blog/git-worktree-remove): the other end of the life cycle
- [Git worktree vs clone vs branch](/blog/git-worktree-vs-clone): when a worktree is the right tool
- [The --worktrees option](/guide/worktrees): claudegrid's reference
