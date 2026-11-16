import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { cells, type Grid } from "../layout.js";
import { run, sleep, which } from "../exec.js";
import { quoteAll } from "../shell.js";
import { CliError } from "../ui.js";
import type { Backend, LaunchContext } from "./types.js";

export interface KonsoleSplit {
  /** Creation index of the view to split. The new view takes the next creation index. */
  from: number;
  /** true splits left/right, false splits top/bottom. */
  horizontal: boolean;
}

/**
 * Konsole puts a new view right after the one it splits. Building each column by splitting the newest
 * view keeps panes in order, and `order` maps creation index to pane index.
 */
export function konsoleSequence(grid: Grid): { splits: KonsoleSplit[]; order: number[] } {
  const byCell = new Map(cells(grid).map((c) => [`${c.col},${c.row}`, c.index]));
  const created = [byCell.get("0,0")!];
  const splits: KonsoleSplit[] = [];
  const tops = [0];
  for (let col = 1; col < grid.columns.length; col++) {
    splits.push({ from: created.length - 1, horizontal: true });
    created.push(byCell.get(`${col},0`)!);
    tops.push(created.length - 1);
  }
  grid.columns.forEach((rows, col) => {
    let last = tops[col]!;
    for (let row = 1; row < rows; row++) {
      splits.push({ from: last, horizontal: false });
      created.push(byCell.get(`${col},${row}`)!);
      last = created.length - 1;
    }
  });
  return { splits, order: created };
}

export interface SplitterNode {
  id: number;
  children: number;
}

/** Parses Window.viewHierarchy output such as `(0)[(1){0|3}|(2){1|4}]` into view ids and splitters. */
export function parseHierarchy(text: string): { views: number[]; splitters: SplitterNode[] } {
  const views: number[] = [];
  const splitters: SplitterNode[] = [];
  const stack: SplitterNode[] = [];
  let pendingId: number | undefined;
  for (const token of text.match(/\(\d+\)|\d+|[[\]{}|]/g) ?? []) {
    if (token.startsWith("(")) pendingId = Number(token.slice(1, -1));
    else if (token === "[" || token === "{") {
      const node = { id: pendingId ?? -1, children: 1 };
      stack.push(node);
      splitters.push(node);
      pendingId = undefined;
    } else if (token === "]" || token === "}") stack.pop();
    else if (token === "|") stack[stack.length - 1]!.children++;
    else views.push(Number(token));
  }
  return { views, splitters };
}

/** Copies the user's default Konsole profile so panes keep their usual font and colors. */
export function buildProfile(command: string, base?: string): string {
  const lines = (base ?? "").split("\n").filter((line) => !/^(Name|Command|Parent)=/.test(line.trim()));
  const general = lines.findIndex((line) => line.trim() === "[General]");
  const ours = ["Name=claudegrid", `Command=${command}`];
  if (general === -1) return ["[General]", ...ours, "", ...lines].join("\n").trimEnd() + "\n";
  lines.splice(general + 1, 0, ...ours);
  return lines.join("\n").trimEnd() + "\n";
}

function defaultProfileText(): string | undefined {
  const config = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "konsolerc");
  const match = existsSync(config) ? /^DefaultProfile=(.+)$/m.exec(readFileSync(config, "utf8")) : null;
  if (!match) return undefined;
  const file = join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "konsole", match[1]!.trim());
  return existsSync(file) ? readFileSync(file, "utf8") : undefined;
}

async function waitForService(service: string, child: ReturnType<typeof spawn>): Promise<void> {
  let exited: number | null | undefined;
  child.once("exit", (code) => (exited = code));
  for (let i = 0; i < 100; i++) {
    if (exited !== undefined) throw new CliError(`konsole exited right away (code ${exited})`, "try `konsole --separate` by hand to see its error");
    if (run("qdbus6", [service, "/Windows/1"], { timeout: 2000 }).ok) return;
    await sleep(100);
  }
  throw new CliError(`konsole did not show up on D-Bus as ${service} within 10 seconds`, "is a D-Bus session bus running? `claudegrid doctor` checks it");
}

export const konsole: Backend = {
  name: "konsole",
  label: "KDE Konsole",
  isCurrent: (env) => Boolean(env.KONSOLE_VERSION || env.KONSOLE_DBUS_SESSION),
  check() {
    if (!which("konsole")) return { ok: false, detail: "konsole is not installed" };
    if (!which("qdbus6")) return { ok: false, detail: "qdbus6 is missing (Qt 6 tools)" };
    if (!process.env.DBUS_SESSION_BUS_ADDRESS && !process.env.XDG_RUNTIME_DIR) return { ok: false, detail: "no D-Bus session bus" };
    return { ok: true, detail: "konsole + qdbus6" };
  },
  prepareSpec(spec, plan) {
    spec.order = konsoleSequence(plan.grid).order;
  },
  async launch(ctx: LaunchContext) {
    const { plan, specPath } = ctx;
    const wrapper = specPath.replace(/\.json$/, ".sh");
    const profile = specPath.replace(/\.json$/, ".profile");
    const konsoleArgs = ["--separate", "--nofork", "--profile", profile, "--workdir", plan.panes[0]!.cwd];
    const { splits } = konsoleSequence(plan.grid);

    if (ctx.dryRun) {
      ctx.run("konsole", konsoleArgs);
      splits.forEach((s) => ctx.run("qdbus6", ["org.kde.konsole-<pid>", "/Windows/1", "org.kde.konsole.Window.createSplit", String(s.from), String(s.horizontal)]));
      return "";
    }

    writeFileSync(wrapper, `#!/bin/sh\nexec ${quoteAll(ctx.paneCommand())}\n`, { mode: 0o700 });
    writeFileSync(profile, buildProfile(wrapper, defaultProfileText()), { mode: 0o600 });

    const child = spawn("konsole", konsoleArgs, { detached: true, stdio: "ignore" });
    child.unref();
    const service = `org.kde.konsole-${child.pid}`;
    await waitForService(service, child);

    const window = (method: string, ...args: string[]) => run("qdbus6", [service, "/Windows/1", `org.kde.konsole.Window.${method}`, ...args]);
    const viewIds = [0];
    for (const split of splits) {
      const before = new Set(parseHierarchy(window("viewHierarchy").stdout).views);
      const result = window("createSplit", String(viewIds[split.from]), String(split.horizontal));
      if (!result.ok || result.stdout !== "true") throw new CliError(`konsole could not split the window: ${result.stderr || result.stdout}`);
      const created = parseHierarchy(window("viewHierarchy").stdout).views.find((v) => !before.has(v));
      viewIds.push(created ?? Math.max(...viewIds) + 1);
    }

    // Repeated splits halve the last view, so even the splitters out. Older Konsole lacks resizeSplits.
    for (const splitter of parseHierarchy(window("viewHierarchy").stdout).splitters) {
      if (splitter.children < 2) continue;
      const share = (100 / splitter.children).toFixed(3);
      run("dbus-send", ["--session", `--dest=${service}`, "/Windows/1", "org.kde.konsole.Window.resizeSplits", `int32:${splitter.id}`, `array:double:${Array(splitter.children).fill(share).join(",")}`]);
    }
    window("setCurrentView", "0");
    return `opened a Konsole window (pid ${child.pid})`;
  },
};
