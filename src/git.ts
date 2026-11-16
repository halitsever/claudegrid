import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { CliError } from "./ui.js";

export const BRANCH_PREFIX = "claudegrid/";

export function git(args: string[], cwd: string): string {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    const err = error as { code?: string; stderr?: string };
    if (err.code === "ENOENT") throw new CliError("git is not installed", "worktrees need git on your PATH");
    throw new CliError(`git ${args[0]} failed: ${(err.stderr ?? "").trim() || (error as Error).message}`);
  }
}

export function gitRoot(cwd: string): string | undefined {
  try {
    return git(["rev-parse", "--show-toplevel"], cwd);
  } catch {
    return undefined;
  }
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 40) || "pane";
}

export interface WorktreeTarget {
  branch: string;
  path: string;
}

/** Worktrees live next to the repo, in `<repo>.claudegrid/`, so they never show up inside the project tree. */
export function worktreeTarget(root: string, group: string, pane: string): WorktreeTarget {
  return {
    branch: `${BRANCH_PREFIX}${slugify(group)}/${slugify(pane)}`,
    path: join(dirname(root), `${basename(root)}.claudegrid`, `${slugify(group)}-${slugify(pane)}`),
  };
}

export interface WorktreeInfo {
  path: string;
  branch?: string;
  head: string;
}

export function listAllWorktrees(root: string): WorktreeInfo[] {
  const out: WorktreeInfo[] = [];
  let current: Partial<WorktreeInfo> = {};
  for (const line of git(["worktree", "list", "--porcelain"], root).split("\n")) {
    if (line.startsWith("worktree ")) current = { path: line.slice(9) };
    else if (line.startsWith("HEAD ")) current.head = line.slice(5);
    else if (line.startsWith("branch ")) current.branch = line.slice(7).replace(/^refs\/heads\//, "");
    else if (line === "" && current.path) {
      out.push(current as WorktreeInfo);
      current = {};
    }
  }
  if (current.path) out.push(current as WorktreeInfo);
  return out;
}

const branchExists = (root: string, branch: string) => {
  try {
    git(["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], root);
    return true;
  } catch {
    return false;
  }
};

export type EnsureResult = "created" | "reused";

/** Creates the worktree, or reuses it when a previous run already made it, so reopening a grid keeps each pane's work. */
export function ensureWorktree(root: string, target: WorktreeTarget): EnsureResult {
  const existing = listAllWorktrees(root).find((w) => w.path === target.path);
  if (existing) {
    if (existing.branch !== target.branch) {
      throw new CliError(`${target.path} is a worktree for ${existing.branch ?? "a detached HEAD"}, expected ${target.branch}`, "remove it with `git worktree remove` and try again");
    }
    return "reused";
  }
  if (existsSync(target.path)) throw new CliError(`${target.path} already exists and is not a git worktree`, "move it away or run `claudegrid worktrees clean`");
  try {
    git(["rev-parse", "--verify", "--quiet", "HEAD"], root);
  } catch {
    throw new CliError("this repository has no commits yet", "worktrees branch off HEAD, so make a first commit");
  }
  if (branchExists(root, target.branch)) git(["worktree", "add", target.path, target.branch], root);
  else git(["worktree", "add", "-b", target.branch, target.path, "HEAD"], root);
  return "created";
}

export interface ManagedWorktree extends WorktreeInfo {
  branch: string;
  dirty: number;
  ahead: number;
}

export function listManagedWorktrees(root: string): ManagedWorktree[] {
  return listAllWorktrees(root)
    .filter((w): w is WorktreeInfo & { branch: string } => Boolean(w.branch?.startsWith(BRANCH_PREFIX)))
    .map((w) => {
      const dirty = existsSync(w.path) ? git(["status", "--porcelain"], w.path).split("\n").filter(Boolean).length : 0;
      const ahead = Number(git(["rev-list", "--count", `HEAD..${w.branch}`], root)) || 0;
      return { ...w, dirty, ahead };
    });
}
