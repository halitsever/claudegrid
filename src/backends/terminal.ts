import { writeFileSync } from "node:fs";
import { run, which } from "../exec.js";
import type { LaunchPlan } from "../plan.js";
import { quoteAll } from "../shell.js";
import { CliError } from "../ui.js";
import type { Backend, LaunchContext } from "./types.js";

/** Usable area of the main screen in Terminal's coordinates: origin top left, below the menu bar. */
export interface Screen {
  left: number;
  top: number;
  width: number;
  height: number;
}

const appleString = (text: string) => `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** NSScreen counts y from the bottom, Terminal's bounds count from the top of the main screen. */
const SCREEN_JXA =
  "ObjC.import('AppKit');var s=$.NSScreen.mainScreen,f=s.frame,v=s.visibleFrame;" +
  "[v.origin.x,f.size.height-v.origin.y-v.size.height,v.size.width,v.size.height].map(Math.round).join(' ')";

function mainScreen(): Screen {
  const parts = run("osascript", ["-l", "JavaScript", "-e", SCREEN_JXA], { timeout: 10_000 }).stdout.split(" ").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n)) || parts[2]! <= 0) return { left: 0, top: 25, width: 1440, height: 875 };
  const [left, top, width, height] = parts as [number, number, number, number];
  return { left, top, width, height };
}

/** Terminal.app has no splits, so every pane is its own window, tiled over the screen like the grid. */
export function terminalScript(plan: LaunchPlan, commands: string[], screen: Screen): string {
  const columns = plan.grid.columns;
  const colWidth = screen.width / columns.length;
  const lines = ['tell application "Terminal"', "  activate"];
  for (const pane of plan.panes) {
    const rowHeight = screen.height / columns[pane.col]!;
    const x1 = Math.round(screen.left + pane.col * colWidth);
    const y1 = Math.round(screen.top + pane.row * rowHeight);
    const x2 = Math.round(screen.left + (pane.col + 1) * colWidth);
    const y2 = Math.round(screen.top + (pane.row + 1) * rowHeight);
    lines.push(`  set t${pane.index} to do script ${appleString(commands[pane.index]!)}`);
    lines.push(`  set custom title of t${pane.index} to ${appleString(pane.title)}`);
    lines.push(`  set bounds of front window to {${x1}, ${y1}, ${x2}, ${y2}}`);
  }
  lines.push("end tell");
  return lines.join("\n") + "\n";
}

export const terminal: Backend = {
  name: "terminal",
  label: "Terminal.app",
  isCurrent: (env) => env.TERM_PROGRAM === "Apple_Terminal",
  check() {
    if (process.platform !== "darwin") return { ok: false, detail: "Terminal.app runs on macOS only" };
    if (!which("osascript")) return { ok: false, detail: "osascript is missing" };
    return { ok: true, detail: "one window per pane, tiled" };
  },
  async launch(ctx: LaunchContext) {
    const { plan } = ctx;
    // `do script` types into the user's shell, so each pane runs a script path instead of a quoted command line.
    const commands = plan.panes.map((p) => {
      if (ctx.dryRun) return quoteAll(ctx.paneCommand(p.index));
      const script = ctx.specPath.replace(/\.json$/, `.pane-${p.index}.sh`);
      writeFileSync(script, `#!/bin/sh\nexec ${quoteAll(ctx.paneCommand(p.index))}\n`, { mode: 0o700 });
      return `exec ${quoteAll([script])}`;
    });
    const screen = ctx.dryRun ? { left: 0, top: 25, width: 1440, height: 875 } : mainScreen();
    const script = terminalScript(plan, commands, screen);
    if (ctx.dryRun) {
      ctx.run("osascript", ["-e", "<script below>"]);
      for (const line of script.trimEnd().split("\n")) ctx.run("#", [line]);
      return "";
    }
    const result = run("osascript", ["-e", script], { timeout: 30_000 });
    if (!result.ok) {
      const denied = /not allowed|1743/i.test(result.stderr);
      throw new CliError(
        `Terminal.app did not open the grid: ${result.stderr}`,
        denied ? "allow your terminal to control Terminal in System Settings > Privacy & Security > Automation" : "run `claudegrid --dry-run -b terminal` to see the AppleScript",
      );
    }
    return `opened ${plan.panes.length} Terminal windows`;
  },
};
