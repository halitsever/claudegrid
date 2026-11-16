import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SCHEMA_URL, type ConfigFile } from "../config.js";
import { gitRoot } from "../git.js";
import { CliError, info, style, tildify } from "../ui.js";

export function starterConfig(): ConfigFile {
  return {
    $schema: SCHEMA_URL,
    panes: [
      { name: "main" },
      { name: "tests", prompt: "Run the test suite and fix whatever fails. Explain each fix." },
      { name: "review", prompt: "Review the uncommitted changes in this repo and point out bugs and risky code." },
      { name: "docs", prompt: "Check that the README and docs still match the code and list anything out of date." },
    ],
    presets: {
      duo: { description: "Two side by side sessions", panes: [{ name: "left" }, { name: "right" }] },
      swarm: { description: "Six agents, each on its own git worktree and branch", panes: 6, worktrees: true },
    },
  };
}

export function init(options: { cwd: string; force: boolean }): void {
  const dir = gitRoot(options.cwd) ?? options.cwd;
  const path = join(dir, ".claudegrid.json");
  if (existsSync(path) && !options.force) throw new CliError(`${tildify(path)} already exists`, "pass --force to overwrite it");
  writeFileSync(path, JSON.stringify(starterConfig(), null, 2) + "\n");
  info(`${style.green("✔")} wrote ${tildify(path)}`);
  info(`\n${style.bold("next")}`);
  info(`  claudegrid            ${style.dim("open the 4 panes from the config")}`);
  info(`  claudegrid swarm      ${style.dim("6 agents on separate worktrees")}`);
  info(`  claudegrid --dry-run  ${style.dim("see what would run")}`);
}
