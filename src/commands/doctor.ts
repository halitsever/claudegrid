import { existsSync } from "node:fs";
import { BACKEND_LIST, pickBackend } from "../backends/index.js";
import { findProjectConfig, readConfig, userConfigPath } from "../config.js";
import { run, which } from "../exec.js";
import { style, tildify } from "../ui.js";

export type Status = "ok" | "warn" | "fail" | "info";

export interface Check {
  name: string;
  status: Status;
  detail: string;
  current?: boolean;
}

export interface DoctorReport {
  requirements: Check[];
  terminals: Check[];
  auto: { backend?: string; error?: string };
  config: Check[];
  ok: boolean;
}

export function collectDoctor(cwd: string): DoctorReport {
  const major = Number(process.versions.node.split(".")[0]);
  const claude = which("claude");
  const git = which("git");
  const requirements: Check[] = [
    { name: "node", status: major >= 20 ? "ok" : "fail", detail: `v${process.versions.node}${major >= 20 ? "" : ", 20 or newer is needed"}` },
    claude
      ? { name: "claude", status: "ok", detail: `${run("claude", ["--version"], { timeout: 10_000 }).stdout.split("\n")[0] || "found"} ${tildify(claude)}` }
      : { name: "claude", status: "fail", detail: "not on PATH. Install: npm install -g @anthropic-ai/claude-code" },
    { name: "git", status: git ? "ok" : "warn", detail: git ? run("git", ["--version"]).stdout : "not installed, worktrees will not work" },
  ];

  const terminals: Check[] = BACKEND_LIST.map((backend) => {
    const status = backend.check();
    return { name: backend.name, status: status.ok ? "ok" : "info", detail: status.detail, current: backend.isCurrent(process.env) };
  });

  const auto: DoctorReport["auto"] = {};
  try {
    auto.backend = pickBackend("auto").name;
  } catch (error) {
    auto.error = (error as Error).message;
  }

  const config: Check[] = [];
  const user = userConfigPath();
  const project = findProjectConfig(cwd);
  for (const [name, path] of [["user", existsSync(user) ? user : undefined], ["project", project]] as const) {
    if (!path) {
      config.push({ name, status: "info", detail: name === "project" ? "none, run `claudegrid init` to create one" : `none (${tildify(user)})` });
      continue;
    }
    try {
      const presets = Object.keys(readConfig(path).data.presets ?? {});
      config.push({ name, status: "ok", detail: `${tildify(path)}${presets.length ? `, presets: ${presets.join(", ")}` : ""}` });
    } catch (error) {
      config.push({ name, status: "fail", detail: (error as Error).message });
    }
  }

  const ok = ![...requirements, ...config].some((c) => c.status === "fail") && !auto.error;
  return { requirements, terminals, auto, config, ok };
}

function line(check: Check): void {
  const mark = { ok: style.green("✔"), warn: style.yellow("!"), fail: style.red("✖"), info: style.dim("•") }[check.status];
  const here = check.current ? style.cyan(" (you are in it)") : "";
  process.stdout.write(`  ${mark} ${check.name.padEnd(16)} ${style.dim(check.detail)}${here}\n`);
}

/** Prints what works on this machine. Returns the exit code: 1 when claudegrid cannot launch at all. */
export function doctor(cwd: string): number {
  const report = collectDoctor(cwd);
  process.stdout.write(`${style.brand("▦ claudegrid doctor")}\n\n${style.bold("requirements")}\n`);
  report.requirements.forEach(line);
  process.stdout.write(`\n${style.bold("terminals")}\n`);
  report.terminals.forEach(line);
  if (report.auto.backend) process.stdout.write(`  ${style.dim("→")} ${"auto picks".padEnd(16)} ${style.bold(report.auto.backend)}\n`);
  else line({ name: "auto picks", status: "fail", detail: report.auto.error ?? "" });
  process.stdout.write(`\n${style.bold("config")}\n`);
  report.config.forEach(line);
  process.stdout.write("\n");
  return report.ok ? 0 : 1;
}
