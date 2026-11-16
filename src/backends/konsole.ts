import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { cells, type Grid } from "../layout.js";
import { run, sleep, which } from "../exec.js";
import { quoteAll } from "../shell.js";
import { writeKonsoleTabTicket } from "../spec.js";
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

export interface ProfileOptions {
  /** Profile name. Konsole looks profiles up by this name when a tab is added over D-Bus. */
  name?: string;
  /** Text for the tab title, instead of Konsole's usual "%d : %n". */
  tabTitle?: string;
}

/** Copies the user's default Konsole profile so panes keep their usual font and colors. */
export function buildProfile(command: string, base?: string, options: ProfileOptions = {}): string {
  const drop = options.tabTitle ? /^(Name|Command|Parent|LocalTabTitleFormat|RemoteTabTitleFormat)=/ : /^(Name|Command|Parent)=/;
  const lines = (base ?? "").split("\n").filter((line) => !drop.test(line.trim()));
  const general = lines.findIndex((line) => line.trim() === "[General]");
  const ours = [`Name=${options.name ?? "claudegrid"}`, `Command=${command}`];
  if (options.tabTitle) ours.push(`LocalTabTitleFormat=${options.tabTitle}`, `RemoteTabTitleFormat=${options.tabTitle}`);
  if (general === -1) return ["[General]", ...ours, "", ...lines].join("\n").trimEnd() + "\n";
  lines.splice(general + 1, 0, ...ours);
  return lines.join("\n").trimEnd() + "\n";
}

const dataHome = () => process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");

function defaultProfileText(): string | undefined {
  const config = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "konsolerc");
  const match = existsSync(config) ? /^DefaultProfile=(.+)$/m.exec(readFileSync(config, "utf8")) : null;
  if (!match) return undefined;
  const file = join(dataHome(), "konsole", match[1]!.trim());
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

export const TAB_PROFILE = "claudegrid";

/**
 * Konsole only loads profiles when it starts, so tabs need a profile that is already in place. It runs a
 * small script at a fixed path, which keeps working when claudegrid moves or updates.
 */
export function ensureTabProfile(paneCommand: string[]): void {
  const script = join(dataHome(), "claudegrid", "konsole-tab.sh");
  const scriptText = `#!/bin/sh\nexec ${quoteAll([...paneCommand.slice(0, paneCommand.indexOf("pane") + 1), "--konsole-tab"])}\n`;
  mkdirSync(dirname(script), { recursive: true });
  if (!existsSync(script) || readFileSync(script, "utf8") !== scriptText) writeFileSync(script, scriptText, { mode: 0o755 });
  const profile = join(dataHome(), "konsole", `${TAB_PROFILE}.profile`);
  if (existsSync(profile) && readFileSync(profile, "utf8").includes(`Command=${script}`)) return;
  mkdirSync(dirname(profile), { recursive: true });
  writeFileSync(profile, buildProfile(script, defaultProfileText(), { name: TAB_PROFILE, tabTitle: "▦ claudegrid" }));
}

/** The Konsole window claudegrid runs in, when it still answers on D-Bus. */
export function currentKonsoleWindow(env: NodeJS.ProcessEnv = process.env): { service: string; path: string } | undefined {
  const service = env.KONSOLE_DBUS_SERVICE;
  const path = env.KONSOLE_DBUS_WINDOW;
  if (!service || !path || !which("qdbus6")) return undefined;
  if (!run("qdbus6", [service, path], { timeout: 3000 }).ok) return undefined;
  return { service: uniqueBusName(service), path };
}

/** Panes see Konsole's unique bus name (":1.42"), so tickets must be keyed by that, not a well-known name. */
function uniqueBusName(service: string): string {
  if (service.startsWith(":")) return service;
  const owner = run("dbus-send", ["--session", "--print-reply=literal", "--dest=org.freedesktop.DBus", "/org/freedesktop/DBus", "org.freedesktop.DBus.GetNameOwner", `string:${service}`]);
  return owner.ok && owner.stdout.trim().startsWith(":") ? owner.stdout.trim() : service;
}

type WindowCall = (method: string, ...args: string[]) => ReturnType<typeof run>;

const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

/** Repeated splits halve the last view, so even out the splitters of one tab. Older Konsole lacks resizeSplits. */
function equalize(service: string, path: string, hierarchyLine: string): void {
  for (const splitter of parseHierarchy(hierarchyLine).splitters) {
    if (splitter.children < 2) continue;
    const share = (100 / splitter.children).toFixed(3);
    run("dbus-send", ["--session", `--dest=${service}`, path, "org.kde.konsole.Window.resizeSplits", `int32:${splitter.id}`, `array:double:${Array(splitter.children).fill(share).join(",")}`]);
  }
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
    const { splits, order } = konsoleSequence(plan.grid);
    const tab = ctx.newTab ? currentKonsoleWindow() : undefined;
    let note = "";
    const title = `▦ ${plan.name}`;
    const wrapper = specPath.replace(/\.json$/, ".sh");

    if (tab) {
      const window: WindowCall = (method, ...args) => run("qdbus6", [tab.service, tab.path, `org.kde.konsole.Window.${method}`, ...args]);
      if (ctx.dryRun) {
        ctx.run("qdbus6", [tab.service, tab.path, "org.kde.konsole.Window.newSession", TAB_PROFILE, plan.panes[0]!.cwd]);
        splits.forEach((s) => ctx.run("qdbus6", [tab.service, tab.path, "org.kde.konsole.Window.createSplit", `<view ${s.from + 1}>`, String(s.horizontal)]));
        return "";
      }
      const known = lines(window("profileList").stdout).includes(TAB_PROFILE);
      ensureTabProfile(ctx.paneCommand());
      if (known) {
        const session = (id: string, creation: number) => {
          writeKonsoleTabTicket(tab.service, id, { spec: specPath, index: order[creation]! });
          for (const context of ["0", "1"]) run("qdbus6", [tab.service, `/Sessions/${id}`, "org.kde.konsole.Session.setTabTitleFormat", context, title]);
        };
        const sessionsNow = () => new Set(lines(window("sessionList").stdout));
        const viewsBefore = new Set(parseHierarchy(window("viewHierarchy").stdout).views);
        const first = window("newSession", TAB_PROFILE, plan.panes[0]!.cwd);
        if (!first.ok) throw new CliError(`konsole could not open a tab: ${first.stderr || first.stdout}`, "use --no-new-tab to open a new window instead");
        session(first.stdout.trim(), 0);
        const firstView = parseHierarchy(window("viewHierarchy").stdout).views.find((v) => !viewsBefore.has(v));
        if (firstView === undefined) throw new CliError("konsole opened a tab but claudegrid could not find it");

        const viewIds = [firstView];
        for (const [k, split] of splits.entries()) {
          const views = new Set(parseHierarchy(window("viewHierarchy").stdout).views);
          const before = sessionsNow();
          const result = window("createSplit", String(viewIds[split.from]), String(split.horizontal));
          if (!result.ok || result.stdout !== "true") throw new CliError(`konsole could not split the tab: ${result.stderr || result.stdout}`);
          viewIds.push(parseHierarchy(window("viewHierarchy").stdout).views.find((v) => !views.has(v)) ?? Math.max(...viewIds) + 1);
          const created = [...sessionsNow()].find((s) => !before.has(s));
          if (created) session(created, k + 1);
        }
        const ourLine = lines(window("viewHierarchy").stdout).find((line) => parseHierarchy(line).views.includes(firstView));
        if (ourLine) equalize(tab.service, tab.path, ourLine);
        window("setCurrentView", String(firstView));
        return "opened a new Konsole tab";
      }
      note = "New tabs work after you restart Konsole, it only reads the claudegrid profile at startup.";
    }

    const profile = specPath.replace(/\.json$/, ".profile");
    const konsoleArgs = ["--separate", "--nofork", "--profile", profile, "--workdir", plan.panes[0]!.cwd];
    if (ctx.dryRun) {
      ctx.run("konsole", konsoleArgs);
      splits.forEach((s) => ctx.run("qdbus6", ["org.kde.konsole-<pid>", "/Windows/1", "org.kde.konsole.Window.createSplit", String(s.from), String(s.horizontal)]));
      return "";
    }

    writeFileSync(wrapper, `#!/bin/sh\nexec ${quoteAll(ctx.paneCommand())}\n`, { mode: 0o700 });
    writeFileSync(profile, buildProfile(wrapper, defaultProfileText(), { tabTitle: title }), { mode: 0o600 });

    const child = spawn("konsole", konsoleArgs, { detached: true, stdio: "ignore" });
    child.unref();
    const service = `org.kde.konsole-${child.pid}`;
    await waitForService(service, child);

    const window: WindowCall = (method, ...args) => run("qdbus6", [service, "/Windows/1", `org.kde.konsole.Window.${method}`, ...args]);
    const viewIds = [0];
    for (const split of splits) {
      const before = new Set(parseHierarchy(window("viewHierarchy").stdout).views);
      const result = window("createSplit", String(viewIds[split.from]), String(split.horizontal));
      if (!result.ok || result.stdout !== "true") throw new CliError(`konsole could not split the window: ${result.stderr || result.stdout}`);
      viewIds.push(parseHierarchy(window("viewHierarchy").stdout).views.find((v) => !before.has(v)) ?? Math.max(...viewIds) + 1);
    }
    equalize(service, "/Windows/1", window("viewHierarchy").stdout);
    window("setCurrentView", "0");
    return `opened a Konsole window (pid ${child.pid})${note ? `. ${note}` : ""}`;
  },
};
