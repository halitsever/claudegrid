import { chmodSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { CliError } from "./ui.js";
import type { LaunchPlan } from "./plan.js";

/** What a pane needs to start itself. Written once per launch and read by every pane. */
export interface PaneSpec {
  name: string;
  title: string;
  cwd: string;
  argv: string[];
  branch?: string;
}

export interface LaunchSpec {
  version: 1;
  name: string;
  keepShell: boolean;
  panes: PaneSpec[];
  /** Konsole only: pane index for each session, in the order Konsole creates them. */
  order?: number[];
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function runtimeDir(): string {
  const dir = join(process.env.XDG_RUNTIME_DIR || tmpdir(), `claudegrid-${process.getuid?.() ?? "user"}`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  return dir;
}

function prune(dir: string): void {
  const now = Date.now();
  for (const file of readdirSync(dir)) {
    const path = join(dir, file);
    try {
      if (now - statSync(path).mtimeMs > MAX_AGE_MS) rmSync(path, { force: true });
    } catch {
      // Another launch may have removed it already.
    }
  }
}

export function specFromPlan(plan: LaunchPlan): LaunchSpec {
  return {
    version: 1,
    name: plan.name,
    keepShell: plan.keepShell,
    panes: plan.panes.map((p) => ({ name: p.name, title: p.title, cwd: p.cwd, argv: p.argv, branch: p.worktree?.branch })),
  };
}

/** Writes the spec and returns its path. The id doubles as a prefix for helper files a backend needs. */
export function writeSpec(spec: LaunchSpec): string {
  const dir = runtimeDir();
  prune(dir);
  const path = join(dir, `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}.json`);
  writeFileSync(path, JSON.stringify(spec, null, 2), { mode: 0o600 });
  return path;
}

/**
 * Panes in a Konsole tab all run the same profile command, so each one finds its grid through a small
 * file named after its D-Bus service and session number, written as soon as the session exists.
 */
export function konsoleTabTicketPath(service: string, session: string): string {
  return join(runtimeDir(), `konsole-tab-${service.replace(/[^\w.-]/g, "_")}-${session}.json`);
}

export function writeKonsoleTabTicket(service: string, session: string, ticket: { spec: string; index: number }): void {
  const path = konsoleTabTicketPath(service, session);
  writeFileSync(`${path}.tmp`, JSON.stringify(ticket), { mode: 0o600 });
  renameSync(`${path}.tmp`, path);
}

export function readSpec(path: string): LaunchSpec {
  try {
    const spec = JSON.parse(readFileSync(path, "utf8")) as LaunchSpec;
    if (spec.version !== 1 || !Array.isArray(spec.panes)) throw new Error("unknown format");
    return spec;
  } catch (error) {
    throw new CliError(`cannot read launch spec ${path}: ${(error as Error).message}`);
  }
}
