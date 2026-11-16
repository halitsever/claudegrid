import { spawn } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { konsoleTabTicketPath, readSpec, type LaunchSpec } from "./spec.js";
import { CliError, style, tildify } from "./ui.js";

interface Exit {
  code: number;
  missing?: boolean;
}

/** Runs a child in the foreground. The parent ignores Ctrl+C so only the child reacts to it. */
function foreground(argv: string[], env: NodeJS.ProcessEnv): Promise<Exit> {
  return new Promise((done) => {
    const [command, ...args] = argv;
    const child = spawn(command!, args, { stdio: "inherit", env });
    const ignore = () => {};
    const forward = (signal: NodeJS.Signals) => () => child.kill(signal);
    const handlers: [NodeJS.Signals, () => void][] = [
      ["SIGINT", ignore],
      ["SIGQUIT", ignore],
      ["SIGTERM", forward("SIGTERM")],
      ["SIGHUP", forward("SIGHUP")],
    ];
    for (const [signal, handler] of handlers) process.on(signal, handler);
    let finished = false;
    const finish = (exit: Exit) => {
      if (finished) return;
      finished = true;
      for (const [signal, handler] of handlers) process.off(signal, handler);
      done(exit);
    };
    child.on("error", (error: NodeJS.ErrnoException) => finish({ code: 127, missing: error.code === "ENOENT" }));
    child.on("exit", (code, signal) => finish({ code: code ?? (signal ? 128 : 1) }));
  });
}

/** Konsole gives every session KONSOLE_DBUS_SESSION=/Sessions/N, numbered in creation order. */
export function konsolePaneIndex(spec: LaunchSpec, env: NodeJS.ProcessEnv = process.env): number | undefined {
  const match = /\/Sessions\/(\d+)$/.exec(env.KONSOLE_DBUS_SESSION ?? "");
  if (!match) return undefined;
  const creation = Number(match[1]) - 1;
  return spec.order?.[creation] ?? creation;
}

/** A pane in a Konsole tab waits for the ticket the launcher writes once it knows the session number. */
async function konsoleTabTicket(env: NodeJS.ProcessEnv): Promise<{ spec: string; index: number } | undefined> {
  const session = /\/Sessions\/(\d+)$/.exec(env.KONSOLE_DBUS_SESSION ?? "")?.[1];
  if (!env.KONSOLE_DBUS_SERVICE || !session) return undefined;
  const path = konsoleTabTicketPath(env.KONSOLE_DBUS_SERVICE, session);
  for (let i = 0; i < 100; i++) {
    try {
      const ticket = JSON.parse(readFileSync(path, "utf8"));
      rmSync(path, { force: true });
      return ticket;
    } catch {
      await new Promise((done) => setTimeout(done, 50));
    }
  }
  return undefined;
}

function setTitle(title: string): void {
  if (process.stdout.isTTY) process.stdout.write(`\x1b]0;${title.replace(/[\x00-\x1f]/g, "")}\x07`);
}

export async function runPane(options: { spec?: string; index?: number; konsoleTab?: boolean }): Promise<number> {
  if (options.konsoleTab) {
    const ticket = await konsoleTabTicket(process.env);
    if (!ticket) {
      process.stderr.write(style.dim("claudegrid: this tab uses the claudegrid profile but no grid is waiting for it, opening a shell\n", process.stderr));
      return (await foreground([process.env.SHELL || "/bin/sh"], process.env)).code;
    }
    return runPane({ spec: ticket.spec, index: ticket.index });
  }
  const specPath = options.spec ?? process.env.CLAUDEGRID_SPEC;
  if (!specPath) throw new CliError("`claudegrid pane` is started by claudegrid inside each pane", "run `claudegrid` instead");
  const spec = readSpec(specPath);
  const index = options.index ?? konsolePaneIndex(spec) ?? 0;
  const pane = spec.panes[index];

  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDEGRID: "1", CLAUDEGRID_GRID: spec.name };
  delete env.CLAUDEGRID_SPEC;
  const shell = [process.env.SHELL || "/bin/sh"];

  if (!pane) {
    process.stderr.write(style.dim(`claudegrid: no pane #${index + 1} in this grid, opening a shell\n`, process.stderr));
    return (await foreground(shell, env)).code;
  }

  Object.assign(env, { CLAUDEGRID_PANE: String(index + 1), CLAUDEGRID_PANE_NAME: pane.name, CLAUDEGRID_PANES: String(spec.panes.length) });
  setTitle(pane.title);
  const where = tildify(pane.cwd) + (pane.branch ? ` ${style.cyan(`(${pane.branch})`)}` : "");
  process.stdout.write(`${style.brand("▦ claudegrid")} ${style.dim(`${index + 1}/${spec.panes.length}`)} ${style.bold(pane.name)} ${style.dim("·")} ${where}\n`);

  try {
    process.chdir(pane.cwd);
  } catch (error) {
    process.stderr.write(`${style.red("error", process.stderr)}: cannot enter ${pane.cwd}: ${(error as Error).message}\n`);
    return (await foreground(shell, env)).code;
  }

  const result = await foreground(pane.argv, env);
  if (result.missing) {
    process.stderr.write(`${style.red("error", process.stderr)}: ${pane.argv[0]} was not found on PATH\n`);
    if (pane.argv[0] === "claude") process.stderr.write(`${style.dim("hint", process.stderr)}: install Claude Code with \`npm install -g @anthropic-ai/claude-code\`\n`);
  }
  if (!spec.keepShell) return result.code;
  process.stdout.write(style.dim(`\n${pane.argv[0]} exited (${result.code}). This is your shell now, type exit to close the pane.\n`));
  return (await foreground(shell, env)).code;
}
