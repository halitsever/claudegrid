import { readdirSync, rmdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { git, gitRoot, listManagedWorktrees, type ManagedWorktree } from "../git.js";
import { CliError, info, style, tildify, warn } from "../ui.js";

function root(cwd: string): string {
  const found = gitRoot(cwd);
  if (!found) throw new CliError(`${cwd} is not inside a git repository`);
  return found;
}

export const worktreeData = (cwd: string): ManagedWorktree[] => listManagedWorktrees(root(cwd));

export function listWorktrees(cwd: string): void {
  const worktrees = worktreeData(cwd);
  if (!worktrees.length) {
    info("no claudegrid worktrees in this repository");
    return;
  }
  const width = Math.max(...worktrees.map((w) => w.branch.length));
  for (const w of worktrees) {
    const state = [w.dirty ? style.yellow(`${w.dirty} changed`) : style.green("clean"), w.ahead ? style.cyan(`${w.ahead} commits ahead`) : ""].filter(Boolean).join(", ");
    process.stdout.write(`${w.branch.padEnd(width)}  ${state}\n${" ".repeat(width)}  ${style.dim(tildify(w.path))}\n`);
  }
}

export interface CleanOptions {
  force: boolean;
  keepBranches: boolean;
  dryRun: boolean;
  /** Only these branches. All claudegrid worktrees when left out. */
  branches?: string[];
}

export interface CleanResult {
  branch: string;
  path: string;
  action: "removed" | "skipped" | "would-remove";
  note?: string;
}

/**
 * Removes claudegrid worktrees. Uncommitted changes and unmerged branches are kept unless forced,
 * since they usually hold an agent's work.
 */
export function cleanWorktreeData(cwd: string, options: CleanOptions): CleanResult[] {
  const repo = root(cwd);
  const results: CleanResult[] = [];
  for (const w of listManagedWorktrees(repo)) {
    if (options.branches && !options.branches.includes(w.branch)) continue;
    if (w.dirty && !options.force) {
      results.push({ branch: w.branch, path: w.path, action: "skipped", note: `${w.dirty} uncommitted change${w.dirty === 1 ? "" : "s"}, use force to discard` });
      continue;
    }
    if (options.dryRun) {
      results.push({ branch: w.branch, path: w.path, action: "would-remove", note: options.keepBranches ? undefined : `and branch ${w.branch}` });
      continue;
    }
    git(["worktree", "remove", ...(options.force ? ["--force"] : []), w.path], repo);
    let note: string | undefined;
    if (!options.keepBranches) {
      try {
        git(["branch", options.force ? "-D" : "-d", w.branch], repo);
      } catch {
        note = `kept branch ${w.branch}: it has unmerged commits, use force to delete it`;
      }
    }
    results.push({ branch: w.branch, path: w.path, action: "removed", note });
  }
  if (!options.dryRun && results.some((r) => r.action === "removed")) {
    git(["worktree", "prune"], repo);
    const holder = join(dirname(repo), `${basename(repo)}.claudegrid`);
    try {
      if (!readdirSync(holder).length) rmdirSync(holder);
    } catch {
      // The holder folder is already gone.
    }
  }
  return results;
}

export function cleanWorktrees(cwd: string, options: CleanOptions): void {
  const results = cleanWorktreeData(cwd, options);
  if (!results.length) {
    info("nothing to clean");
    return;
  }
  for (const r of results) {
    if (r.action === "skipped") warn(`skipping ${r.branch}: ${r.note}`);
    else if (r.action === "would-remove") info(`would remove ${tildify(r.path)}${r.note ? ` ${r.note}` : ""}`);
    else info(`${style.green("✔")} removed ${tildify(r.path)}${r.note ? style.yellow(` (${r.note})`) : ""}`);
  }
  if (options.dryRun) return;
  const removed = results.filter((r) => r.action === "removed").length;
  info(`${removed} worktree${removed === 1 ? "" : "s"} removed`);
}
