import { existsSync, realpathSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import type { BackendName, PaneConfig, ResolvedGrid } from "./config.js";
import { gitRoot, worktreeTarget, type WorktreeTarget } from "./git.js";
import { autoGrid, cells, parseLayout, paneCount, type Grid } from "./layout.js";
import { CliError } from "./ui.js";

export const DEFAULT_PANES = 4;

export interface PanePlan {
  index: number;
  col: number;
  row: number;
  name: string;
  title: string;
  cwd: string;
  argv: string[];
  worktree?: WorktreeTarget;
}

export interface LaunchPlan {
  name: string;
  backend: BackendName;
  grid: Grid;
  panes: PanePlan[];
  keepShell: boolean;
  newTab: boolean;
  /** Git root when worktrees are on, so they can be created right before launch. */
  repoRoot?: string;
}

export interface PlanInput {
  cwd: string;
  grid: ResolvedGrid;
  preset?: string;
  name?: string;
  /** Per-pane prompts from the command line, in pane order. */
  prompts?: string[];
  /** Claude Code flags given after `--`. */
  extraArgs?: string[];
}

function pickGrid(grid: ResolvedGrid, paneConfigs: PaneConfig[]): Grid {
  if (grid.layout) return parseLayout(grid.layout);
  if (typeof grid.panes === "number") return autoGrid(grid.panes);
  return autoGrid(paneConfigs.length || DEFAULT_PANES);
}

const realPath = (path: string) => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};

export function buildPlan(input: PlanInput): LaunchPlan {
  const { grid: config } = input;
  const baseDir = config.dir ? resolve(input.cwd, config.dir) : input.cwd;
  const paneConfigs: PaneConfig[] = Array.isArray(config.panes) ? config.panes.map((p) => ({ ...p })) : [];
  (input.prompts ?? []).forEach((prompt, i) => {
    paneConfigs[i] = { ...(paneConfigs[i] ?? {}), prompt };
  });

  const grid = pickGrid(config, paneConfigs);
  const count = paneCount(grid);
  if (paneConfigs.length > count) {
    throw new CliError(`${paneConfigs.length} panes are configured but the layout only has ${count} slots`, "raise the layout size or drop some panes or prompts");
  }

  let repoRoot: string | undefined;
  if (config.worktrees) {
    repoRoot = gitRoot(baseDir);
    if (!repoRoot) throw new CliError(`worktrees need a git repository, and ${baseDir} is not inside one`, "run claudegrid from your repo or pass --no-worktrees");
  }

  const name = input.name ?? input.preset ?? basename(repoRoot ?? baseDir);
  const group = input.preset ?? "grid";
  const seen = new Set<string>();

  const panes = cells(grid).map((cell): PanePlan => {
    const pane = paneConfigs[cell.index] ?? {};
    const label = pane.name ?? `pane-${cell.index + 1}`;
    if (seen.has(label)) throw new CliError(`two panes are named "${label}"`, "pane names must be unique because they name worktrees and titles");
    seen.add(label);

    const model = pane.model ?? config.model;
    const argv = [
      config.command ?? "claude",
      ...(config.args ?? []),
      ...(model ? ["--model", model] : []),
      ...(pane.args ?? []),
      ...(input.extraArgs ?? []),
      ...(pane.prompt ? [pane.prompt] : []),
    ];

    let cwd = pane.dir ? (isAbsolute(pane.dir) ? pane.dir : resolve(baseDir, pane.dir)) : baseDir;
    let worktree: WorktreeTarget | undefined;
    if (repoRoot) {
      // git reports the resolved path, so compare resolved paths. On macOS /var is really /private/var.
      const rel = relative(realPath(repoRoot), realPath(cwd));
      if (rel.startsWith("..") || isAbsolute(rel)) throw new CliError(`pane "${label}" uses ${cwd}, which is outside the repository`, "with worktrees on, every pane dir must be inside the repo");
      worktree = worktreeTarget(repoRoot, group, label);
      cwd = join(worktree.path, rel);
    } else if (!existsSync(cwd) || !statSync(cwd).isDirectory()) {
      throw new CliError(`pane "${label}" points at ${cwd}, which is not a directory`);
    }

    return { ...cell, name: label, title: pane.name ?? `claude ${cell.index + 1}`, cwd, argv, worktree };
  });

  return { name, backend: config.backend ?? "auto", grid, panes, keepShell: config.keepShell ?? true, newTab: config.newTab ?? true, repoRoot };
}
