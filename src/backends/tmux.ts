import { spawnSync } from "node:child_process";
import { splitPercent } from "../layout.js";
import { run, which } from "../exec.js";
import type { Backend, LaunchContext } from "./types.js";

/** tmux session names cannot contain dots or colons. */
export const tmuxSessionName = (name: string) => `claudegrid-${name.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "grid"}`;

/** "tmux 3.6a" becomes [3, 6]. Development builds like "tmux next-3.7" parse the same way. */
export function parseTmuxVersion(text: string): [number, number] | undefined {
  const match = /(\d+)\.(\d+)/.exec(text);
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

function uniqueSession(base: string): string {
  for (let i = 1; ; i++) {
    const name = i === 1 ? base : `${base}-${i}`;
    if (!run("tmux", ["has-session", "-t", `=${name}`]).ok) return name;
  }
}

export const tmux: Backend = {
  name: "tmux",
  label: "tmux",
  isCurrent: (env) => Boolean(env.TMUX),
  check() {
    if (!which("tmux")) return { ok: false, detail: "tmux is not installed" };
    const text = run("tmux", ["-V"]).stdout;
    const version = parseTmuxVersion(text);
    if (version && (version[0] < 3 || (version[0] === 3 && version[1] < 1))) return { ok: false, detail: `${text} is too old, 3.1 or newer is needed` };
    return { ok: true, detail: text };
  },
  async launch(ctx: LaunchContext) {
    const { plan } = ctx;
    // Inside tmux a new tab is a tmux window. Without it, a separate session that we switch to.
    const inside = Boolean(process.env.TMUX);
    const asWindow = inside && ctx.newTab;
    const session = ctx.dryRun ? tmuxSessionName(plan.name) : uniqueSession(tmuxSessionName(plan.name));
    const tmuxRun = (...args: string[]) => ctx.run("tmux", args);
    const cmd = (index: number) => ["--", ...ctx.paneCommand(index)];
    const byCell = new Map(plan.panes.map((p) => [`${p.col},${p.row}`, p]));
    const paneId = new Map<number, string>();

    const first = plan.panes[0]!;
    const size = ["-x", String(process.stdout.columns || 200), "-y", String(process.stdout.rows || 50)];
    const created = asWindow
      ? tmuxRun("new-window", "-P", "-F", "#{pane_id}", "-n", plan.name, "-c", first.cwd, ...cmd(0))
      : tmuxRun("new-session", "-d", "-P", "-F", "#{pane_id}", "-s", session, "-n", plan.name, ...size, "-c", first.cwd, ...cmd(0));
    paneId.set(0, created);

    // Each split hands the new pane the share of space still owed to the columns or rows after it.
    const columns = plan.grid.columns;
    const tops = [created];
    for (let col = 1; col < columns.length; col++) {
      const pane = byCell.get(`${col},0`)!;
      const id = tmuxRun("split-window", "-h", "-d", "-P", "-F", "#{pane_id}", "-t", tops[col - 1]!, "-l", `${splitPercent(columns.length - col + 1)}%`, "-c", pane.cwd, ...cmd(pane.index));
      tops.push(id);
      paneId.set(pane.index, id);
    }
    columns.forEach((rows, col) => {
      let last = tops[col]!;
      for (let row = 1; row < rows; row++) {
        const pane = byCell.get(`${col},${row}`)!;
        last = tmuxRun("split-window", "-v", "-d", "-P", "-F", "#{pane_id}", "-t", last, "-l", `${splitPercent(rows - row + 1)}%`, "-c", pane.cwd, ...cmd(pane.index));
        paneId.set(pane.index, last);
      }
    });

    for (const pane of plan.panes) tmuxRun("set-option", "-p", "-t", paneId.get(pane.index)!, "@claudegrid_name", pane.title);
    tmuxRun("set-option", "-w", "-t", created, "pane-border-status", "top");
    tmuxRun("set-option", "-w", "-t", created, "pane-border-format", " #{?pane_active,#[bold],}#{@claudegrid_name}#[default] ");
    tmuxRun("select-pane", "-t", created);

    if (ctx.dryRun) return "";
    if (asWindow) return "opened a new tmux window";
    if (inside) {
      if (run("tmux", ["switch-client", "-t", `=${session}`]).ok) return `switched to the new tmux session ${session}`;
      return `started tmux session ${session}, switch to it with: tmux switch-client -t ${session}`;
    }
    if (ctx.detach || !ctx.interactive) return `started tmux session ${session}, attach with: tmux attach -t ${session}`;
    spawnSync("tmux", ["attach-session", "-t", `=${session}`], { stdio: "inherit" });
    return "";
  },
};
