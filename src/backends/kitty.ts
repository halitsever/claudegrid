import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { findProgram } from "../exec.js";

const kittyBinary = () => findProgram("kitty", "kitty.app");
import { quote, quoteAll } from "../shell.js";
import type { LaunchPlan } from "../plan.js";
import type { Backend, LaunchContext } from "./types.js";

/** A kitty session file. The grid layout lays windows out in reading order, so pane 1 stays top left. */
export function kittySession(plan: LaunchPlan, paneCommand: (index: number) => string[]): string {
  const lines = [`new_tab ${plan.name}`, "layout grid"];
  for (const pane of plan.panes) lines.push(`launch --title ${quote(pane.title)} --cwd ${quote(pane.cwd)} ${quoteAll(paneCommand(pane.index))}`);
  return lines.join("\n") + "\n";
}

export const kitty: Backend = {
  name: "kitty",
  label: "kitty",
  isCurrent: (env) => Boolean(env.KITTY_WINDOW_ID),
  check: () => (kittyBinary() ? { ok: true, detail: kittyBinary()! } : { ok: false, detail: "kitty is not installed" }),
  async launch(ctx: LaunchContext) {
    const session = ctx.specPath.replace(/\.json$/, ".kitty");
    const content = kittySession(ctx.plan, (i) => ctx.paneCommand(i));
    if (ctx.dryRun) {
      ctx.run("kitty", ["--session", session]);
      for (const line of content.trimEnd().split("\n")) ctx.run("#", [line]);
      return "";
    }
    writeFileSync(session, content, { mode: 0o600 });
    const child = spawn(kittyBinary() ?? "kitty", ["--title", ctx.plan.name, "--session", session], { detached: true, stdio: "ignore" });
    child.unref();
    return `opened a kitty window (pid ${child.pid})`;
  },
};
