---
title: "git worktree remove, prune and Cleanup"
titleTemplate: false
description: "Remove git worktrees safely: git worktree remove, --force for dirty or locked ones, prune for folders deleted by hand, and deleting the leftover branch."
date: 2026-11-28
faq:
  - q: "How do I delete a git worktree?"
    a: "Run git worktree remove <path>. It works for clean worktrees. If the folder has modified or untracked files, git refuses unless you add --force."
  - q: "What is the difference between git worktree prune and remove?"
    a: "remove deletes a worktree's folder and its administrative files. prune only cleans up administrative files for worktrees whose folders are already gone, for example after rm -rf."
  - q: "Does git worktree remove delete the branch?"
    a: "No. The branch stays. Delete it afterwards with git branch -d, or git branch -D if it has commits that are not merged."
  - q: "Why can't I delete a branch after removing its worktree?"
    a: "If git says the branch is used by a worktree, the worktree still exists. Remove the worktree first. If git says the branch is not fully merged, it has commits you would lose; use git branch -D only if you mean it."
---

# Removing git worktrees and cleaning up their branches

<p class="post-meta">Halit Sever · 28 November 2026</p>

Worktrees are cheap to create, so they pile up. Removing one properly takes two steps: remove the worktree, then decide what to do with its branch. This post walks through both, plus `prune` for worktrees whose folders you already deleted. Every error message below comes from running the commands with git 2.53.

## Remove a clean worktree

```sh
git worktree remove ../app-hotfix
```

That deletes the folder and the bookkeeping under `.git/worktrees/`. It only works when the worktree is clean. Any change stops it:

```txt
fatal: '../app-hotfix' contains modified or untracked files, use --force to delete it
```

## Remove a worktree with changes

Look first, since `--force` throws the changes away:

```sh
git -C ../app-hotfix status
git worktree remove --force ../app-hotfix
```

Commit or stash anything you want to keep before forcing.

## Locked worktrees

A worktree can be locked, usually because it lives on a drive that is not always mounted:

```sh
git worktree lock --reason "on usb" ../app-usb
```

Removing it then fails even with one `--force`:

```txt
fatal: cannot remove a locked working tree, lock reason: on usb
use 'remove -f -f' to override or unlock first
```

Either `git worktree unlock ../app-usb` and remove it normally, or pass `-f -f`.

## The branch stays behind

`git worktree remove` does not touch branches. After removing, delete the branch yourself:

```sh
git branch -d hotfix
```

Two errors you may meet:

```txt
error: cannot delete branch 'topic' used by worktree at '/home/me/code/w2'
```

The worktree still exists; remove it first.

```txt
error: the branch 'topic2' is not fully merged
```

The branch has commits that are not in your current branch. `git branch -D topic2` deletes it anyway, and those commits are gone unless something else points at them.

## Folders you deleted by hand: prune

If you `rm -rf` a worktree folder, git still has its records. `git worktree list` marks it:

```txt
/home/me/code/app-feat   72c48cd [feature/login] prunable
```

Clean that up with `prune`. Run it with `-n` first to see what it would do:

```sh
git worktree prune -n -v
git worktree prune -v
```

```txt
Removing worktrees/app-feat: gitdir file points to non-existent location
```

You rarely need to run it by hand. `git gc` runs `git worktree prune --expire 3.months.ago`, so stale records go away on their own after three months. `gc.worktreePruneExpire` changes that grace period.

## prune vs remove

| | `git worktree remove` | `git worktree prune` |
| --- | --- | --- |
| Deletes the folder | yes | no, the folder is already gone |
| Deletes `.git/worktrees/<name>` | yes | yes, for missing folders only |
| Works on dirty worktrees | with `--force` | not applicable |
| Touches branches | no | no |

## Cleaning many at once

A loop over `git worktree list --porcelain` works, but it is easy to delete something you wanted. A safer rule is: remove only worktrees that are clean, and delete only branches that are merged.

That is the rule `claudegrid worktrees clean` follows for the worktrees [claudegrid](/) creates for its Claude Code panes:

```sh
claudegrid worktrees                   # list: changed files and commits ahead
claudegrid worktrees clean --dry-run   # show what would go
claudegrid worktrees clean             # clean worktrees and merged branches only
claudegrid worktrees clean --keep-branches
claudegrid worktrees clean --force     # also dirty worktrees and unmerged branches
```

Without `--force` it skips worktrees with uncommitted changes and keeps branches with unmerged commits, and it runs `git worktree prune` at the end. It only touches branches under `claudegrid/`, so your own worktrees are left alone. The [desktop app](/guide/app) has the same list with a clean button.

## FAQ

<Faq />

## Related

- [git worktree add](/blog/git-worktree-add): creating them
- [What is a git worktree?](/blog/what-is-a-git-worktree): what is shared and what is not
- [Claude Code worktrees](/claude-code-worktree): one branch per agent
- [The --worktrees option](/guide/worktrees): claudegrid's reference
