import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { run, which } from "../exec.js";
import type { LaunchPlan } from "../plan.js";
import { quoteAll } from "../shell.js";
import { CliError } from "../ui.js";
import { konsoleSequence } from "./konsole.js";
import type { Backend, LaunchContext } from "./types.js";

const appleString = (text: string) => `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const installed = () => ["/Applications/iTerm.app", join(homedir(), "Applications", "iTerm.app")].some((p) => existsSync(p));

/**
 * AppleScript that opens the grid. iTerm2 splits the same way Konsole does, so the column-first split
 * order is shared. "split vertically" puts the new pane to the right, "split horizontally" below.
 */
export function itermScript(plan: LaunchPlan, commands: string[], options: { newTab: boolean }): string {
  const { splits, order } = konsoleSequence(plan.grid);
  const pane = (creation: number) => plan.panes[order[creation]!]!;
  const lines = ['tell application "iTerm"', "  activate"];
  const first = appleString(commands[order[0]!]!);
  if (options.newTab) lines.push(`  tell current window to set grid to (create tab with default profile command ${first})`);
  else lines.push(`  set grid to (create window with default profile command ${first})`);
  lines.push("  set s0 to current session of grid", `  tell s0 to set name to ${appleString(pane(0).title)}`);
  splits.forEach((split, k) => {
    const creation = k + 1;
    const direction = split.horizontal ? "vertically" : "horizontally";
    lines.push(`  tell s${split.from} to set s${creation} to (split ${direction} with default profile command ${appleString(commands[order[creation]!]!)})`);
    lines.push(`  tell s${creation} to set name to ${appleString(pane(creation).title)}`);
  });
  lines.push("  select s0", "end tell");
  return lines.join("\n") + "\n";
}

export const iterm2: Backend = {
  name: "iterm2",
  label: "iTerm2",
  isCurrent: (env) => env.TERM_PROGRAM === "iTerm.app",
  check() {
    if (process.platform !== "darwin") return { ok: false, detail: "iTerm2 runs on macOS only" };
    if (!installed()) return { ok: false, detail: "iTerm2 is not installed" };
    if (!which("osascript")) return { ok: false, detail: "osascript is missing" };
    return { ok: true, detail: "iTerm2 + AppleScript" };
  },
  async launch(ctx: LaunchContext) {
    const { plan } = ctx;
    const newTab = ctx.newTab && iterm2.isCurrent(process.env);
    // iTerm2 runs each pane's command line itself, so every pane gets a one line script without quoting puzzles.
    const commands = plan.panes.map((p) => {
      if (ctx.dryRun) return quoteAll(ctx.paneCommand(p.index));
      const script = ctx.specPath.replace(/\.json$/, `.pane-${p.index}.sh`);
      writeFileSync(script, `#!/bin/sh\nexec ${quoteAll(ctx.paneCommand(p.index))}\n`, { mode: 0o700 });
      return script;
    });
    const script = itermScript(plan, commands, { newTab });
    if (ctx.dryRun) {
      ctx.run("osascript", ["-e", "<script below>"]);
      for (const line of script.trimEnd().split("\n")) ctx.run("#", [line]);
      return "";
    }
    const result = run("osascript", ["-e", script], { timeout: 30_000 });
    if (!result.ok) {
      const denied = /not allowed|1743|-1743/i.test(result.stderr);
      throw new CliError(
        `iTerm2 did not open the grid: ${result.stderr}`,
        denied ? "allow your terminal to control iTerm2 in System Settings > Privacy & Security > Automation" : "run `claudegrid --dry-run -b iterm2` to see the AppleScript",
      );
    }
    return newTab ? "opened a new iTerm2 tab" : "opened an iTerm2 window";
  },
};
