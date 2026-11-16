import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { selfCommand } from "../exec.js";
import { info, style, tildify } from "../ui.js";

const dataHome = () => process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
const entryPath = () => join(dataHome(), "applications", "claudegrid.desktop");
const iconPath = () => join(dataHome(), "icons", "hicolor", "scalable", "apps", "claudegrid.svg");

/** Desktop entry Exec values quote arguments with double quotes and escape ", `, $ and \. */
const desktopQuote = (arg: string) => `"${arg.replace(/(["`$\\])/g, "\\$1")}"`;

export function desktopEntry(command: string[]): string {
  return [
    "[Desktop Entry]",
    "Type=Application",
    "Name=claudegrid",
    "GenericName=Claude Code grid",
    "Comment=Open a grid of Claude Code agents",
    `Exec=${[...command, "ui"].map(desktopQuote).join(" ")}`,
    "Icon=claudegrid",
    "Terminal=false",
    "Categories=Development;Utility;",
    "Keywords=claude;ai;agent;terminal;tmux;konsole;grid;",
    "StartupWMClass=claudegrid",
    "",
  ].join("\n");
}

export function installDesktop(): void {
  mkdirSync(join(dataHome(), "applications"), { recursive: true });
  mkdirSync(join(dataHome(), "icons", "hicolor", "scalable", "apps"), { recursive: true });
  copyFileSync(fileURLToPath(new URL("../../docs/public/logo.svg", import.meta.url)), iconPath());
  writeFileSync(entryPath(), desktopEntry(selfCommand()), { mode: 0o755 });
  spawnSync("update-desktop-database", [join(dataHome(), "applications")], { stdio: "ignore" });
  info(`${style.green("✔")} added claudegrid to your app menu (${tildify(entryPath())})`);
  info(style.dim("  it opens `claudegrid ui` in its own window"));
}

export function uninstallDesktop(): void {
  const removed = [entryPath(), iconPath()].filter((p) => existsSync(p));
  for (const path of removed) rmSync(path);
  spawnSync("update-desktop-database", [join(dataHome(), "applications")], { stdio: "ignore" });
  info(removed.length ? `${style.green("✔")} removed claudegrid from your app menu` : "claudegrid was not in your app menu");
}
