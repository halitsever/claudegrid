import type { BackendName } from "../config.js";
import type { LaunchPlan } from "../plan.js";
import type { LaunchSpec } from "../spec.js";

export type TerminalName = Exclude<BackendName, "auto">;

export interface Availability {
  ok: boolean;
  detail: string;
}

/**
 * Runs one external command and returns its stdout. Dry runs swap in a recorder, so the preview is
 * produced by the same code path as a real launch.
 */
export type Runner = (command: string, args: string[]) => string;

export interface LaunchContext {
  plan: LaunchPlan;
  specPath: string;
  /** Command that starts pane `index`. Without an index the pane works it out itself (Konsole). */
  paneCommand: (index?: number) => string[];
  detach: boolean;
  dryRun: boolean;
  run: Runner;
}

export interface Backend {
  name: TerminalName;
  label: string;
  check(): Availability;
  /** True when claudegrid itself runs inside this terminal. */
  isCurrent(env: NodeJS.ProcessEnv): boolean;
  prepareSpec?(spec: LaunchSpec, plan: LaunchPlan): void;
  launch(ctx: LaunchContext): Promise<string>;
}
