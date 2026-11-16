import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const CLI = new URL("../dist/cli.js", import.meta.url).pathname;

/** A temp dir with an empty XDG config, so the developer's own claudegrid config never leaks into tests. */
export function sandbox() {
  // The resolved path, because on macOS the temp dir sits behind the /var -> /private/var symlink.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "claudegrid-test-")));
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

/** Without the terminal's own variables, so a test never opens a tab in the developer's terminal. */
export function cleanEnv(extra = {}) {
  const env = { ...process.env, NO_COLOR: "1" };
  for (const key of Object.keys(env)) if (/^(KONSOLE_|TMUX|WEZTERM_|KITTY_)/.test(key)) delete env[key];
  return { ...env, ...extra };
}

export function cli(args, options = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env: cleanEnv(options.env), cwd: options.cwd });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

export const has = (command) => spawnSync("sh", ["-c", `command -v ${command}`]).status === 0;
