import { splitPercent } from "../layout.js";
import { run, which } from "../exec.js";
import { CliError } from "../ui.js";
import type { Backend, LaunchContext } from "./types.js";

export const wezterm: Backend = {
  name: "wezterm",
  label: "WezTerm",
  isCurrent: (env) => Boolean(env.WEZTERM_PANE),
  check() {
    if (!which("wezterm")) return { ok: false, detail: "wezterm is not installed" };
    if (!run("wezterm", ["cli", "list"], { timeout: 5000 }).ok) return { ok: false, detail: "WezTerm is installed but not running" };
    return { ok: true, detail: "wezterm cli" };
  },
  async launch(ctx: LaunchContext) {
    const { plan } = ctx;
    const cli = (...args: string[]) => {
      try {
        return ctx.run("wezterm", ["cli", ...args]);
      } catch (error) {
        throw new CliError((error as Error).message, "claudegrid adds a window to a running WezTerm, so open WezTerm first");
      }
    };
    const byCell = new Map(plan.panes.map((p) => [`${p.col},${p.row}`, p]));
    const first = plan.panes[0]!;
    const created = cli("spawn", "--new-window", "--cwd", first.cwd, "--", ...ctx.paneCommand(0));

    const columns = plan.grid.columns;
    const tops = [created];
    for (let col = 1; col < columns.length; col++) {
      const pane = byCell.get(`${col},0`)!;
      tops.push(cli("split-pane", "--pane-id", tops[col - 1]!, "--right", "--percent", String(splitPercent(columns.length - col + 1)), "--cwd", pane.cwd, "--", ...ctx.paneCommand(pane.index)));
    }
    columns.forEach((rows, col) => {
      let last = tops[col]!;
      for (let row = 1; row < rows; row++) {
        const pane = byCell.get(`${col},${row}`)!;
        last = cli("split-pane", "--pane-id", last, "--bottom", "--percent", String(splitPercent(rows - row + 1)), "--cwd", pane.cwd, "--", ...ctx.paneCommand(pane.index));
      }
    });
    cli("set-tab-title", "--pane-id", created, plan.name);
    cli("activate-pane", "--pane-id", created);
    return ctx.dryRun ? "" : "opened a WezTerm window";
  },
};
