import { BACKEND_LIST, pickBackend } from "../backends/index.js";
import { findProjectConfig, readConfig, userConfigPath } from "../config.js";
import { run, which } from "../exec.js";
import { existsSync } from "node:fs";
import { CliError, style, tildify } from "../ui.js";

type Status = "ok" | "warn" | "fail" | "info";

function line(status: Status, label: string, detail: string): void {
  const mark = { ok: style.green("✔"), warn: style.yellow("!"), fail: style.red("✖"), info: style.dim("•") }[status];
  process.stdout.write(`  ${mark} ${label.padEnd(16)} ${style.dim(detail)}\n`);
}

/** Prints what works on this machine. Returns the exit code: 1 when claudegrid cannot launch at all. */
export function doctor(cwd: string): number {
  let failed = false;
  process.stdout.write(`${style.brand("▦ claudegrid doctor")}\n\n${style.bold("requirements")}\n`);

  const major = Number(process.versions.node.split(".")[0]);
  line(major >= 20 ? "ok" : "fail", "node", `v${process.versions.node}${major >= 20 ? "" : ", 20 or newer is needed"}`);
  failed ||= major < 20;

  const claude = which("claude");
  if (claude) line("ok", "claude", `${run("claude", ["--version"], { timeout: 10_000 }).stdout.split("\n")[0] || "found"} ${tildify(claude)}`);
  else line("fail", "claude", "not on PATH. Install: npm install -g @anthropic-ai/claude-code");
  failed ||= !claude;

  const git = which("git");
  line(git ? "ok" : "warn", "git", git ? run("git", ["--version"]).stdout : "not installed, worktrees will not work");

  process.stdout.write(`\n${style.bold("terminals")}\n`);
  for (const backend of BACKEND_LIST) {
    const status = backend.check();
    const here = backend.isCurrent(process.env) ? style.cyan(" (you are in it)") : "";
    line(status.ok ? "ok" : "info", backend.name, status.detail + here);
  }
  try {
    const chosen = pickBackend("auto");
    process.stdout.write(`  ${style.dim("→")} ${"auto picks".padEnd(16)} ${style.bold(chosen.name)}\n`);
  } catch (error) {
    line("fail", "auto picks", (error as CliError).message);
    failed = true;
  }

  process.stdout.write(`\n${style.bold("config")}\n`);
  const user = userConfigPath();
  const project = findProjectConfig(cwd);
  for (const [label, path] of [["user", existsSync(user) ? user : undefined], ["project", project]] as const) {
    if (!path) {
      line("info", label, label === "project" ? "none, run `claudegrid init` to create one" : `none (${tildify(user)})`);
      continue;
    }
    try {
      const loaded = readConfig(path);
      const presets = Object.keys(loaded.data.presets ?? {});
      line("ok", label, `${tildify(path)}${presets.length ? `, presets: ${presets.join(", ")}` : ""}`);
    } catch (error) {
      line("fail", label, (error as Error).message);
      failed = true;
    }
  }
  process.stdout.write("\n");
  return failed ? 1 : 0;
}
