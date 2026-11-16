import { spawnSync } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CliError } from "./ui.js";

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export function which(command: string): string | undefined {
  if (command.includes("/")) return isExecutable(command) ? command : undefined;
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (dir && isExecutable(join(dir, command))) return join(dir, command);
  }
  return undefined;
}

/** macOS apps keep their command line tool inside the bundle, which is often not on PATH. */
export function findProgram(command: string, macApp?: string): string | undefined {
  const found = which(command);
  if (found || process.platform !== "darwin" || !macApp) return found;
  for (const dir of ["/Applications", join(homedir(), "Applications")]) {
    const inside = join(dir, macApp, "Contents", "MacOS", command);
    if (isExecutable(inside)) return inside;
  }
  return undefined;
}

export interface RunResult {
  ok: boolean;
  status: number | null;
  stdout: string;
  stderr: string;
}

export function run(command: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {}): RunResult {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: options.timeout ?? 15_000, ...options });
  const stderr = (result.stderr ?? "") + (result.error ? result.error.message : "");
  return { ok: !result.error && result.status === 0, status: result.status, stdout: (result.stdout ?? "").trim(), stderr: stderr.trim() };
}

export function runOrThrow(command: string, args: string[], what: string, options?: Parameters<typeof run>[2]): string {
  const result = run(command, args, options);
  if (!result.ok) throw new CliError(`${what} failed: ${result.stderr || `exit code ${result.status}`}`);
  return result.stdout;
}

export const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** How to start this same CLI again from another process, independent of PATH. */
export function selfCommand(): string[] {
  return [process.execPath, fileURLToPath(new URL("./cli.js", import.meta.url))];
}
