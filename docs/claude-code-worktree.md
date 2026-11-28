---
title: "Claude Code Worktrees: One Branch per Agent"
titleTemplate: false
description: "Run Claude Code in git worktrees so parallel agents never edit the same files: Claude Code's --worktree flag, and claudegrid -w for a grid of agents."
faq:
  - q: "What is a worktree in Claude Code?"
    a: "A git worktree is a second checkout of the same repository on its own branch. Claude Code can start a session in one with claude --worktree, so that session edits its own copy of the files while sharing the repository history."
  - q: "Where does claude --worktree put the worktree?"
    a: "Under .claude/worktrees/<name>/ at the repository root, on a new branch named worktree-<name>. Anthropic suggests adding .claude/worktrees/ to .gitignore."
  - q: "Where does claudegrid put its worktrees?"
    a: "Next to the repository, never inside it: ~/code/app.claudegrid/grid-pane-1 on branch claudegrid/grid/pane-1, and so on. A preset or -t name replaces grid in both."
  - q: "Do I need claudegrid to use worktrees with Claude Code?"
    a: "No. claude --worktree works on its own, one session per terminal. claudegrid helps when you want several agents at once: it creates one worktree per pane, opens the grid, and lists or cleans the worktrees afterwards."
  - q: "How do I clean up claudegrid worktrees?"
    a: "Run claudegrid worktrees clean. It removes clean worktrees and merged branches and skips anything with uncommitted changes or unmerged commits unless you pass --force."
---

# Give every Claude Code agent its own git worktree

Two Claude Code sessions in the same checkout edit the same files, and sooner or later one overwrites the other. A git worktree fixes that: each agent gets its own folder and its own branch, while all of them share one repository history. Claude Code can create one worktree per session. claudegrid creates one per pane and opens the whole grid in one command:

```sh
claudegrid -w -n 3
```

<img src="/demo.svg" alt="claudegrid opening Claude Code panes side by side in one terminal window" width="960" height="560" />

This is the plan `claudegrid -w -n 3 -b tmux --dry-run` prints in a repository at `~/code/app`, before anything runs:

```txt
▦ claudegrid app · 2 columns (2+1) · tmux
   1 pane-1  ~/code/app.claudegrid/grid-pane-1 (claudegrid/grid/pane-1)
             claude
   2 pane-2  ~/code/app.claudegrid/grid-pane-2 (claudegrid/grid/pane-2)
             claude
   3 pane-3  ~/code/app.claudegrid/grid-pane-3 (claudegrid/grid/pane-3)
             claude
```

Three panes, three checkouts, three branches. Drop `--dry-run` and the grid opens with `claude` running in each.

## Claude Code's own --worktree flag

Claude Code has worktrees built in. From [Anthropic's worktree docs](https://code.claude.com/docs/en/worktrees), checked on 28 November 2026:

```sh
claude --worktree feature-auth     # or -w
```

- The worktree goes under `.claude/worktrees/<name>/` in your repository, on a new branch `worktree-<name>`. Without a name, Claude picks one.
- New worktrees branch from the default branch on the remote. Set `worktree.baseRef` to `"head"` to branch from your current local `HEAD` instead.
- A `.worktreeinclude` file (gitignore syntax) copies untracked files such as `.env` into each new worktree.
- When you exit, Claude removes a clean worktree of an unnamed session and asks before it removes one with changes.

Run the same command with another name in a second terminal and you have two isolated sessions. For one or two agents, that is all you need.

## When a grid adds something

claudegrid is for the case where you want several agents at once and want to see them side by side:

| | `claude --worktree` | `claudegrid -w` |
| --- | --- | --- |
| Agents per command | one | 2 to 16, one per pane |
| Opens the terminals | no, you open each one | yes, in tmux, Konsole, iTerm2, kitty, WezTerm or Terminal.app |
| Worktree location | `.claude/worktrees/<name>/` inside the repo | `<repo>.claudegrid/<group>-<pane>/` next to the repo |
| Branch name | `worktree-<name>` | `claudegrid/<group>/<pane>` |
| Base | the remote default branch, or `HEAD` with `worktree.baseRef` | your current `HEAD` |
| A prompt per agent | one per command | `-p` per pane, or `prompt` in a preset |
| Reopening | `claude --worktree <name> --resume <session-id>` | the same grid reuses the same worktrees |
| Cleanup | on exit, per session | `claudegrid worktrees clean` for all of them |

The two do not conflict. claudegrid runs plain `claude` in each pane, and you can pass any Claude Code flag to every pane after `--`.

## How folders and branches are named

claudegrid builds the names from the group and the pane name:

- The group is the preset name, the `-t` name, or `grid`.
- The pane name is its `name` from the config, or `pane-1`, `pane-2` and so on.

With a preset `feature` and a pane named `api`, the folder is `app.claudegrid/feature-api` and the branch is `claudegrid/feature/api`. New branches start from your current `HEAD`. Open the same grid again and claudegrid finds the existing worktrees and reuses them, so each agent picks up where it stopped. A pane `dir` such as `web` maps into its worktree too.

Keeping worktrees next to the repository means they never show up inside your project tree or as untracked files in your main checkout.

## Give each agent its own task

```sh
claudegrid -w -p "add rate limiting to the API" -p "write tests for the auth module" -p "fix the flaky checkout test"
```

Or save it as a preset in `.claudegrid.json` and start it by name:

```json
{
  "presets": {
    "swarm": {
      "description": "Six agents, each on its own branch",
      "panes": 6,
      "worktrees": true
    }
  }
}
```

```sh
claudegrid swarm
```

`"worktrees": true` in the project config turns worktrees on for every grid; `--no-worktrees` turns them off for one run. See [Presets](/guide/presets).

## Review, merge and clean up

Each worktree is an ordinary branch, so review it with git:

```sh
git log main..claudegrid/grid/pane-2
git diff main...claudegrid/grid/pane-2
git merge claudegrid/grid/pane-2
```

Then list and clean:

```sh
claudegrid worktrees                   # branches, changed files, commits ahead
claudegrid worktrees clean --dry-run   # what would go
claudegrid worktrees clean             # clean worktrees and merged branches
```

Without `--force`, cleaning never throws work away: worktrees with uncommitted changes are skipped and branches with unmerged commits are kept. In the [desktop app](/guide/app), the Worktrees view lists the same branches and cleans the ones you select.

## Before you start

- The repository needs at least one commit, since worktrees branch off `HEAD`.
- A worktree is a fresh checkout. Untracked files like `.env` and installed dependencies are not there, so each agent has to install them, or you copy them in.
- All worktrees share one `.git` directory, so commits made in one are visible from the others right away.
- `claudegrid doctor` checks git, Claude Code and your terminals. `--dry-run` shows every git and terminal command first.

## FAQ

<Faq />

## Read next

- [The --worktrees option](/guide/worktrees): reference for the flag and the config key
- [What is a git worktree?](/blog/what-is-a-git-worktree): the git side, explained
- [git worktree remove, prune and cleanup](/blog/git-worktree-remove): removing them by hand
- [Run Claude Code in tmux](/guide/tmux): grids on a server over SSH
