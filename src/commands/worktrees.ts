import { readdirSync, rmdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { git, gitRoot, listManagedWorktrees } from "../git.js";
import { CliError, info, style, tildify, warn } from "../ui.js";

function root(cwd: string): string {
  const found = gitRoot(cwd);
  if (!found) throw new CliError(`${cwd} is not inside a git repository`);
  return found;
}

export function listWorktrees(cwd: string): void {
  const worktrees = listManagedWorktrees(root(cwd));
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

/**
 * Removes claudegrid worktrees. Uncommitted changes and unmerged branches are kept unless forced,
 * since they usually hold an agent's work.
 */
export function cleanWorktrees(cwd: string, options: { force: boolean; keepBranches: boolean; dryRun: boolean }): void {
  const repo = root(cwd);
  const worktrees = listManagedWorktrees(repo);
  if (!worktrees.length) {
    info("nothing to clean");
    return;
  }
  let removed = 0;
  for (const w of worktrees) {
    if (w.dirty && !options.force) {
      warn(`skipping ${w.branch}: ${w.dirty} uncommitted change${w.dirty === 1 ? "" : "s"} (use --force to discard them)`);
      continue;
    }
    if (options.dryRun) {
      info(`would remove ${tildify(w.path)}${options.keepBranches ? "" : ` and branch ${w.branch}`}`);
      continue;
    }
    git(["worktree", "remove", ...(options.force ? ["--force"] : []), w.path], repo);
    removed++;
    let note = "";
    if (!options.keepBranches) {
      try {
        git(["branch", options.force ? "-D" : "-d", w.branch], repo);
      } catch {
        note = style.yellow(` (kept branch ${w.branch}: it has unmerged commits, use --force to delete it)`);
      }
    }
    info(`${style.green("✔")} removed ${tildify(w.path)}${note}`);
  }
  if (options.dryRun) return;
  git(["worktree", "prune"], repo);
  const holder = join(dirname(repo), `${basename(repo)}.claudegrid`);
  try {
    if (!readdirSync(holder).length) rmdirSync(holder);
  } catch {
    // The holder folder is already gone.
  }
  info(`${removed} worktree${removed === 1 ? "" : "s"} removed`);
}
