import { pickBackend, type Backend } from "../backends/index.js";
import type { LaunchContext, Runner } from "../backends/types.js";
import { BACKENDS, loadConfigs, mergeGrids, resolveLayers, type BackendName, type GridConfig } from "../config.js";
import { runOrThrow, selfCommand } from "../exec.js";
import { ensureWorktree } from "../git.js";
import { describeGrid } from "../layout.js";
import { buildPlan, type LaunchPlan } from "../plan.js";
import { quoteAll } from "../shell.js";
import { specFromPlan, writeSpec } from "../spec.js";
import { CliError, didYouMean, info, style, tildify } from "../ui.js";

export interface LaunchOptions {
  cwd: string;
  preset?: string;
  config?: string;
  /** A complete grid that replaces every config layer. The web UI sends this. */
  grid?: GridConfig;
  layout?: string;
  backend?: string;
  worktrees?: boolean;
  model?: string;
  command?: string;
  keepShell?: boolean;
  name?: string;
  prompts: string[];
  extraArgs: string[];
  dryRun: boolean;
  json: boolean;
  detach: boolean;
}

function cliLayer(o: LaunchOptions): GridConfig {
  if (o.backend && !BACKENDS.includes(o.backend as BackendName)) {
    throw new CliError(`unknown backend "${o.backend}"`, didYouMean(o.backend, BACKENDS) ?? `pick one of ${BACKENDS.join(", ")}`);
  }
  return { layout: o.layout, backend: o.backend as BackendName | undefined, worktrees: o.worktrees, model: o.model, command: o.command, keepShell: o.keepShell };
}

export function planFromOptions(o: LaunchOptions): LaunchPlan {
  const layers = o.grid ? [o.grid] : resolveLayers(loadConfigs(o.cwd, o.config), o.preset);
  return buildPlan({ cwd: o.cwd, grid: mergeGrids(...layers, cliLayer(o)), preset: o.preset, name: o.name, prompts: o.prompts, extraArgs: o.extraArgs });
}

export function planJson(plan: LaunchPlan, backend: Backend) {
  return {
    name: plan.name,
    backend: backend.name,
    layout: describeGrid(plan.grid),
    columns: plan.grid.columns,
    keepShell: plan.keepShell,
    panes: plan.panes.map((p) => ({ index: p.index + 1, name: p.name, title: p.title, column: p.col + 1, row: p.row + 1, cwd: p.cwd, command: p.argv, worktree: p.worktree })),
  };
}

/** The commands a launch would run, produced by the backend itself with a recording runner. */
export async function dryRunSteps(plan: LaunchPlan, backend: Backend): Promise<string[]> {
  const steps: string[] = [];
  let fake = 0;
  const recorder: Runner = (command, args) => {
    steps.push(command === "#" ? `  ${args[0]}` : quoteAll([command, ...args]));
    return `<pane${++fake}>`;
  };
  for (const pane of plan.panes.filter((p) => p.worktree)) steps.push(quoteAll(["git", "worktree", "add", pane.worktree!.path, pane.worktree!.branch]));
  const ctx: LaunchContext = {
    plan,
    specPath: "<spec>.json",
    paneCommand: (i) => ["claudegrid", "pane", "--spec", "<spec>.json", ...(i === undefined ? [] : ["--index", String(i)])],
    detach: true,
    interactive: false,
    dryRun: true,
    run: recorder,
  };
  await backend.launch(ctx);
  return steps;
}

export interface LaunchResult {
  message: string;
  notes: string[];
}

/** Creates worktrees, writes the launch spec and hands the plan to the backend. */
export async function executeLaunch(plan: LaunchPlan, backend: Backend, options: { detach: boolean; interactive: boolean }): Promise<LaunchResult> {
  const notes: string[] = [];
  for (const pane of plan.panes) {
    if (!pane.worktree || !plan.repoRoot) continue;
    const result = ensureWorktree(plan.repoRoot, pane.worktree);
    notes.push(`${result === "created" ? "created" : "reusing"} worktree ${tildify(pane.worktree.path)} (${pane.worktree.branch})`);
  }
  const spec = specFromPlan(plan);
  backend.prepareSpec?.(spec, plan);
  const specPath = writeSpec(spec);
  const self = selfCommand();
  const message = await backend.launch({
    plan,
    specPath,
    paneCommand: (i) => [...self, "pane", "--spec", specPath, ...(i === undefined ? [] : ["--index", String(i)])],
    detach: options.detach,
    interactive: options.interactive,
    dryRun: false,
    run: (command, args) => runOrThrow(command, args, `${command} ${args[0] ?? ""}`.trim()),
  });
  return { message, notes };
}

export function printPlan(plan: LaunchPlan, backend: string): void {
  const out = process.stdout;
  out.write(`${style.brand("▦ claudegrid")} ${style.bold(plan.name)} ${style.dim(`· ${describeGrid(plan.grid)} · ${backend}`)}\n`);
  const width = Math.max(...plan.panes.map((p) => p.name.length));
  for (const pane of plan.panes) {
    const where = tildify(pane.cwd) + (pane.worktree ? style.cyan(` (${pane.worktree.branch})`) : "");
    out.write(`  ${style.dim(String(pane.index + 1).padStart(2))} ${pane.name.padEnd(width)}  ${where}\n`);
    out.write(`     ${" ".repeat(width)}  ${style.dim(quoteAll(pane.argv))}\n`);
  }
}

export async function launch(o: LaunchOptions): Promise<void> {
  const plan = planFromOptions(o);
  const backend = pickBackend(plan.backend);

  if (o.json) {
    process.stdout.write(JSON.stringify(planJson(plan, backend), null, 2) + "\n");
    return;
  }

  printPlan(plan, backend.label);
  if (o.dryRun) {
    const steps = await dryRunSteps(plan, backend);
    process.stdout.write(`\n${style.dim("dry run, these commands would run:")}\n${steps.map((s) => `  ${s}`).join("\n")}\n`);
    return;
  }

  const result = await executeLaunch(plan, backend, { detach: o.detach, interactive: Boolean(process.stdin.isTTY) });
  for (const note of result.notes) info(style.dim(note));
  if (result.message) info(style.green(`✔ ${result.message}`));
}
