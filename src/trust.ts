import { existsSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CliError } from "./ui.js";

/** Claude Code keeps its folder trust answers here, under projects.<path>.hasTrustDialogAccepted. */
export function claudeStatePath(env: NodeJS.ProcessEnv = process.env): string {
  return env.CLAUDE_CONFIG_DIR ? join(env.CLAUDE_CONFIG_DIR, ".claude.json") : join(env.HOME || homedir(), ".claude.json");
}

const realPath = (path: string) => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};

/** Marks the folders as trusted so Claude Code skips its safety question. Returns the folders that were new. */
export function trustFolders(dirs: string[], file = claudeStatePath()): string[] {
  let state: Record<string, unknown> = {};
  if (existsSync(file)) {
    try {
      state = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    } catch (error) {
      throw new CliError(`cannot read ${file}: ${(error as Error).message}`, "run without --trust and answer the question in each pane");
    }
  }
  const projects = (state.projects ??= {}) as Record<string, Record<string, unknown>>;
  const added: string[] = [];
  for (const dir of new Set(dirs.flatMap((d) => [d, realPath(d)]))) {
    const entry = (projects[dir] ??= {});
    if (entry.hasTrustDialogAccepted === true) continue;
    entry.hasTrustDialogAccepted = true;
    added.push(dir);
  }
  if (!added.length) return added;
  // A running Claude Code may read the file at any moment, so it must never see half of it.
  const temp = `${file}.claudegrid-${process.pid}`;
  writeFileSync(temp, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
  renameSync(temp, file);
  return added;
}
