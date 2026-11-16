import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const MAX = 10;

export function recentPath(): string {
  return join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "claudegrid", "recent.json");
}

export function readRecent(): string[] {
  try {
    const list = JSON.parse(readFileSync(recentPath(), "utf8"));
    return Array.isArray(list) ? list.filter((p): p is string => typeof p === "string" && existsSync(p)) : [];
  } catch {
    return [];
  }
}

export function addRecent(dir: string): string[] {
  const list = [dir, ...readRecent().filter((p) => p !== dir)].slice(0, MAX);
  try {
    mkdirSync(dirname(recentPath()), { recursive: true });
    writeFileSync(recentPath(), JSON.stringify(list, null, 2) + "\n");
  } catch {
    // A read-only state dir only costs the recent list.
  }
  return list;
}
