import { pickBackend } from "../backends/index.js";
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
  const layers = resolveLayers(loadConfigs(o.cwd, o.config), o.preset);
  return buildPlan({ cwd: o.cwd, grid: mergeGrids(...layers, cliLayer(o)), preset: o.preset, name: o.name, prompts: o.prompts, extraArgs: o.extraArgs });
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
    const panes = plan.panes.map((p) => ({ index: p.index + 1, name: p.name, title: p.title, column: p.col + 1, row: p.row + 1, cwd: p.cwd, command: p.argv, worktree: p.worktree }));
    process.stdout.write(JSON.stringify({ name: plan.name, backend: backend.name, layout: describeGrid(plan.grid), keepShell: plan.keepShell, panes }, null, 2) + "\n");
    return;
  }

  printPlan(plan, backend.label);
  const spec = specFromPlan(plan);
  backend.prepareSpec?.(spec, plan);

  if (o.dryRun) {
    const steps: string[] = [];
    let fake = 0;
    const recorder: Runner = (command, args) => {
      steps.push(command === "#" ? `  ${args[0]}` : quoteAll([command, ...args]));
      return `<pane${++fake}>`;
    };
    for (const pane of plan.panes.filter((p) => p.worktree)) steps.push(quoteAll(["git", "worktree", "add", pane.worktree!.path, pane.worktree!.branch]));
    const ctx: LaunchContext = { plan, specPath: "<spec>.json", paneCommand: (i) => ["claudegrid", "pane", "--spec", "<spec>.json", ...(i === undefined ? [] : ["--index", String(i)])], detach: o.detach, dryRun: true, run: recorder };
    await backend.launch(ctx);
    process.stdout.write(`\n${style.dim("dry run, these commands would run:")}\n${steps.map((s) => `  ${s}`).join("\n")}\n`);
    return;
  }

  for (const pane of plan.panes) {
    if (!pane.worktree || !plan.repoRoot) continue;
    const result = ensureWorktree(plan.repoRoot, pane.worktree);
    info(`${style.dim(result === "created" ? "created" : "reusing")} worktree ${tildify(pane.worktree.path)} ${style.cyan(`(${pane.worktree.branch})`)}`);
  }

  const specPath = writeSpec(spec);
  const self = selfCommand();
  const ctx: LaunchContext = {
    plan,
    specPath,
    paneCommand: (i) => [...self, "pane", "--spec", specPath, ...(i === undefined ? [] : ["--index", String(i)])],
    detach: o.detach,
    dryRun: false,
    run: (command, args) => runOrThrow(command, args, `${command} ${args[0] ?? ""}`.trim()),
  };
  const message = await backend.launch(ctx);
  if (message) info(style.green(`✔ ${message}`));
}
