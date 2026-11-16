import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const CLI = new URL("../dist/cli.js", import.meta.url).pathname;

/** A temp dir with an empty XDG config, so the developer's own claudegrid config never leaks into tests. */
export function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), "claudegrid-test-"));
  process.env.XDG_CONFIG_HOME = join(dir, ".config");
  return dir;
}

export function gitRepo() {
  const dir = sandbox();
  const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
  git("init", "-q", "-b", "main");
  git("-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "init");
  return dir;
}

export function writeConfig(dir, config) {
  writeFileSync(join(dir, ".claudegrid.json"), JSON.stringify(config));
}

export function cli(args, options = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env: { ...process.env, NO_COLOR: "1", ...options.env }, cwd: options.cwd });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

export const has = (command) => spawnSync("sh", ["-c", `command -v ${command}`]).status === 0;
