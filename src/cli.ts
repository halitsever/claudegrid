#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs, type ParseArgsConfig } from "node:util";
import { completion, SUBCOMMANDS } from "./commands/completion.js";
import { installDesktop, uninstallDesktop } from "./commands/desktop.js";
import { doctor } from "./commands/doctor.js";
import { init } from "./commands/init.js";
import { launch } from "./commands/launch.js";
import { update } from "./commands/update.js";
import { cleanWorktrees, listWorktrees } from "./commands/worktrees.js";
import { loadConfigs, presetNames } from "./config.js";
import { runPane } from "./pane.js";
import { openUi } from "./server/open.js";
import { startUiServer } from "./server/index.js";
import { CliError, didYouMean, printError, style } from "./ui.js";

const version = (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version;

const LAUNCH_OPTIONS = {
  layout: { type: "string", short: "l" },
  panes: { type: "string", short: "n" },
  backend: { type: "string", short: "b" },
  worktrees: { type: "boolean", short: "w" },
  "no-worktrees": { type: "boolean" },
  model: { type: "string", short: "m" },
  prompt: { type: "string", short: "p", multiple: true },
  config: { type: "string", short: "c" },
  cwd: { type: "string", short: "C" },
  name: { type: "string", short: "t" },
  command: { type: "string" },
  "keep-shell": { type: "boolean" },
  "no-keep-shell": { type: "boolean" },
  "new-tab": { type: "boolean" },
  "no-new-tab": { type: "boolean" },
  trust: { type: "boolean" },
  "no-trust": { type: "boolean" },
  "dry-run": { type: "boolean" },
  json: { type: "boolean" },
  detach: { type: "boolean", short: "d" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
} as const satisfies ParseArgsConfig["options"];

function help(): string {
  const b = style.bold;
  const d = style.dim;
  return `${style.brand("▦ claudegrid")} ${d(`v${version}`)}  run several Claude Code sessions side by side

${b("usage")}
  claudegrid [preset] [options] [-- claude flags]
  claudegrid <command>

${b("options")}
  -l, --layout <grid>     COLSxROWS like 3x2, or a pane count like 6 ${d("(default 2x2)")}
  -n, --panes <count>     same as --layout <count>
  -p, --prompt <text>     prompt for the next pane, repeat for more panes
  -m, --model <model>     model for every pane, e.g. opus or sonnet
  -w, --worktrees         give every pane its own git worktree and branch
      --no-worktrees      turn worktrees off when the config turns them on
  -b, --backend <name>    auto, konsole, iterm2, tmux, kitty, wezterm or terminal ${d("(default auto)")}
  -C, --cwd <dir>         run from this directory
  -c, --config <file>     use this config file instead of .claudegrid.json
  -t, --name <name>       name for the window, tmux session and worktree group
      --command <cmd>     run another program instead of claude
      --no-keep-shell     close the pane when claude exits
      --no-new-tab        open a new window instead of a tab in this terminal
      --no-trust          let Claude Code ask its "trust this folder" question in every pane
  -d, --detach            start the tmux session without attaching
      --dry-run           print the plan and commands, open nothing
      --json              print the plan as JSON
  -h, --help              show this help
  -v, --version           show the version

${b("commands")}
  ui                      open the claudegrid app in a window ${d("(--port, --no-open, -C)")}
  desktop install         add claudegrid to your app menu ${d("(desktop uninstall removes it)")}
  init [--force]          create .claudegrid.json with example panes and presets
  doctor                  check claude, terminals and config files
  update [--check]        install the latest claudegrid from npm
  presets [--names]       list presets from your user and project config
  worktrees [list]        show claudegrid worktrees with their state
  worktrees clean         remove them ${d("(--force, --keep-branches, --dry-run)")}
  completion <shell>      print bash, zsh or fish completion

${b("examples")}
  claudegrid                              ${d("4 panes in the current directory")}
  claudegrid -l 3x2 -m opus               ${d("6 panes on Opus")}
  claudegrid -p "fix lint" -p "write tests"   ${d("a different task per pane")}
  claudegrid -w -n 3                      ${d("3 agents on separate branches")}
  claudegrid review                       ${d("the review preset from .claudegrid.json")}
  claudegrid -- --continue                ${d("pass flags to every claude")}

${d("docs: https://halitsever.github.io/claudegrid/")}
`;
}

function parse<T extends ParseArgsConfig["options"]>(args: string[], options: T) {
  try {
    return parseArgs({ args, options, allowPositionals: true, strict: true });
  } catch (error) {
    const message = (error as Error).message.replace(/\. To specify a positional.*$/s, "");
    const flag = /'(-[^']+)'/.exec(message)?.[1];
    const known = Object.keys(options ?? {}).map((k) => `--${k}`);
    throw new CliError(message.charAt(0).toLowerCase() + message.slice(1), (flag && didYouMean(flag, known)) ?? "Claude Code flags go after --, for example: claudegrid -- --continue");
  }
}

async function main(argv: string[]): Promise<number> {
  const dash = argv.indexOf("--");
  const own = dash === -1 ? argv : argv.slice(0, dash);
  const passthrough = dash === -1 ? [] : argv.slice(dash + 1);
  const [first, ...rest] = own;

  switch (first) {
    case "pane": {
      const { values } = parse(rest, { spec: { type: "string" }, index: { type: "string" }, "konsole-tab": { type: "boolean" } });
      return runPane({ spec: values.spec, index: values.index === undefined ? undefined : Number(values.index), konsoleTab: values["konsole-tab"] });
    }
    case "init": {
      const { values } = parse(rest, { force: { type: "boolean" }, cwd: { type: "string", short: "C" } });
      init({ cwd: resolve(values.cwd ?? "."), force: Boolean(values.force) });
      return 0;
    }
    case "doctor":
      return doctor(process.cwd());
    case "update": {
      const { values } = parse(rest, { check: { type: "boolean" } });
      return update(version, { check: Boolean(values.check) });
    }
    case "presets": {
      const { values } = parse(rest, { names: { type: "boolean" } });
      const sources = loadConfigs(process.cwd());
      const names = presetNames(sources);
      if (values.names) {
        process.stdout.write(names.join("\n") + (names.length ? "\n" : ""));
        return 0;
      }
      if (!names.length) {
        process.stdout.write(`no presets yet. Add some under "presets" in .claudegrid.json, or run ${style.bold("claudegrid init")}\n`);
        return 0;
      }
      const width = Math.max(...names.map((n) => n.length));
      for (const name of names) {
        const preset = sources.project?.data.presets?.[name] ?? sources.user?.data.presets?.[name];
        const from = sources.project?.data.presets?.[name] ? "project" : "user";
        process.stdout.write(`${style.bold(name.padEnd(width))}  ${preset?.description ?? ""} ${style.dim(`(${from})`)}\n`);
      }
      return 0;
    }
    case "worktrees": {
      const { values, positionals } = parse(rest, { force: { type: "boolean" }, "keep-branches": { type: "boolean" }, "dry-run": { type: "boolean" } });
      const action = positionals[0] ?? "list";
      if (action === "list") listWorktrees(process.cwd());
      else if (action === "clean") cleanWorktrees(process.cwd(), { force: Boolean(values.force), keepBranches: Boolean(values["keep-branches"]), dryRun: Boolean(values["dry-run"]) });
      else throw new CliError(`unknown worktrees action "${action}"`, "use `claudegrid worktrees list` or `claudegrid worktrees clean`");
      return 0;
    }
    case "completion":
      process.stdout.write(completion(rest[0]));
      return 0;
    case "ui": {
      const { values } = parse(rest, { port: { type: "string" }, "no-open": { type: "boolean" }, cwd: { type: "string", short: "C" }, "keep-alive": { type: "boolean" } });
      const port = values.port === undefined ? undefined : Number(values.port);
      if (port !== undefined && (!Number.isInteger(port) || port < 0 || port > 65535)) throw new CliError(`invalid port "${values.port}"`);
      const open = !values["no-open"];
      // A window we opened ourselves can close the server when it goes away. A server started with --no-open waits for you.
      const stopWhenIdle = open && !values["keep-alive"];
      const server = await startUiServer({
        cwd: resolve(values.cwd ?? "."),
        port,
        version,
        onIdle: stopWhenIdle ? () => void server.close().then(() => process.exit(0)) : undefined,
      });
      process.stdout.write(`${style.brand("▦ claudegrid ui")} ${style.dim(`v${version}`)}\n  ${server.url}\n`);
      if (open) {
        const browser = openUi(server.url);
        process.stdout.write(style.dim(browser ? `  opened with ${browser}${stopWhenIdle ? ", stops when the window closes" : ""}\n` : "  open the link above in your browser\n"));
      }
      process.stdout.write(style.dim("  Ctrl+C to stop\n"));
      const stop = () => void server.close().then(() => process.exit(0));
      process.on("SIGINT", stop);
      process.on("SIGTERM", stop);
      return new Promise<number>(() => {});
    }
    case "desktop": {
      const action = rest[0] ?? "install";
      if (action === "install") installDesktop(version);
      else if (action === "uninstall") uninstallDesktop();
      else throw new CliError(`unknown desktop action "${action}"`, "use `claudegrid desktop install` or `claudegrid desktop uninstall`");
      return 0;
    }
    case "help":
      process.stdout.write(help());
      return 0;
  }

  const { values, positionals } = parse(own, LAUNCH_OPTIONS);
  if (values.help) {
    process.stdout.write(help());
    return 0;
  }
  if (values.version) {
    process.stdout.write(`${version}\n`);
    return 0;
  }
  if (positionals.length > 1) throw new CliError(`expected at most one preset, got ${positionals.join(", ")}`, 'quote prompts and pass them with -p, e.g. -p "fix the tests"');
  const preset = positionals[0];
  const cwd = resolve(values.cwd ?? ".");
  const known = preset ? presetNames(loadConfigs(cwd, values.config)) : [];
  if (preset && !known.includes(preset)) {
    const hint = didYouMean(preset, [...SUBCOMMANDS, ...known]);
    if (hint) throw new CliError(`unknown command or preset "${preset}"`, hint);
  }
  if (values.layout && values.panes) throw new CliError("use either --layout or --panes, not both");
  if (values.worktrees && values["no-worktrees"]) throw new CliError("--worktrees and --no-worktrees cancel each other out");
  if (values["new-tab"] && values["no-new-tab"]) throw new CliError("--new-tab and --no-new-tab cancel each other out");
  if (values.trust && values["no-trust"]) throw new CliError("--trust and --no-trust cancel each other out");

  await launch({
    cwd,
    preset,
    config: values.config,
    layout: values.layout ?? values.panes,
    backend: values.backend,
    worktrees: values.worktrees ? true : values["no-worktrees"] ? false : undefined,
    model: values.model,
    command: values.command,
    keepShell: values["keep-shell"] ? true : values["no-keep-shell"] ? false : undefined,
    newTab: values["new-tab"] ? true : values["no-new-tab"] ? false : undefined,
    trust: values.trust ? true : values["no-trust"] ? false : undefined,
    name: values.name,
    prompts: values.prompt ?? [],
    extraArgs: passthrough,
    dryRun: Boolean(values["dry-run"]),
    json: Boolean(values.json),
    detach: Boolean(values.detach),
  });
  return 0;
}

// Piping into `head` closes stdout early. That is not an error worth a stack trace.
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});

main(process.argv.slice(2)).then(
  (code) => (process.exitCode = code),
  (error) => (process.exitCode = printError(error)),
);
