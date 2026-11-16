import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { selfCommand } from "../exec.js";
import { quoteAll } from "../shell.js";
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

const macApp = () => join(homedir(), "Applications", "claudegrid.app");

export function macInfoPlist(version: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>claudegrid</string>
  <key>CFBundleDisplayName</key><string>claudegrid</string>
  <key>CFBundleIdentifier</key><string>io.github.halitsever.claudegrid</string>
  <key>CFBundleVersion</key><string>${version}</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>claudegrid</string>
  <key>CFBundleIconFile</key><string>claudegrid</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
`;
}

/** Apps started from Finder get a bare PATH, so the launcher borrows the login shell's to find claude and git. */
export function macLauncher(command: string[]): string {
  return `#!/bin/sh\nPATH="$("\${SHELL:-/bin/zsh}" -lc 'printf %s "$PATH"' 2>/dev/null):$PATH" exec ${quoteAll([...command, "ui"])}\n`;
}

function installMacApp(version: string): void {
  const app = macApp();
  rmSync(app, { recursive: true, force: true });
  mkdirSync(join(app, "Contents", "MacOS"), { recursive: true });
  mkdirSync(join(app, "Contents", "Resources"), { recursive: true });
  writeFileSync(join(app, "Contents", "Info.plist"), macInfoPlist(version));
  writeFileSync(join(app, "Contents", "MacOS", "claudegrid"), macLauncher(selfCommand()), { mode: 0o755 });

  // sips and iconutil ship with macOS. Without them the app still works, just with a generic icon.
  const png = fileURLToPath(new URL("../../docs/public/logo-512.png", import.meta.url));
  const iconset = join(app, "Contents", "Resources", "claudegrid.iconset");
  mkdirSync(iconset);
  for (const size of [16, 32, 128, 256, 512]) {
    spawnSync("sips", ["-z", String(size), String(size), png, "--out", join(iconset, `icon_${size}x${size}.png`)], { stdio: "ignore" });
    if (size <= 256) spawnSync("sips", ["-z", String(size * 2), String(size * 2), png, "--out", join(iconset, `icon_${size}x${size}@2x.png`)], { stdio: "ignore" });
  }
  spawnSync("iconutil", ["-c", "icns", iconset, "-o", join(app, "Contents", "Resources", "claudegrid.icns")], { stdio: "ignore" });
  rmSync(iconset, { recursive: true, force: true });
  info(`${style.green("✔")} created ${tildify(app)}`);
  info(style.dim("  find it in Launchpad or Spotlight, it opens `claudegrid ui` in its own window"));
}

export function installDesktop(version = "0"): void {
  if (process.platform === "darwin") return installMacApp(version);
  mkdirSync(join(dataHome(), "applications"), { recursive: true });
  mkdirSync(join(dataHome(), "icons", "hicolor", "scalable", "apps"), { recursive: true });
  copyFileSync(fileURLToPath(new URL("../../docs/public/logo.svg", import.meta.url)), iconPath());
  writeFileSync(entryPath(), desktopEntry(selfCommand()), { mode: 0o755 });
  spawnSync("update-desktop-database", [join(dataHome(), "applications")], { stdio: "ignore" });
  info(`${style.green("✔")} added claudegrid to your app menu (${tildify(entryPath())})`);
  info(style.dim("  it opens `claudegrid ui` in its own window"));
}

export function uninstallDesktop(): void {
  if (process.platform === "darwin") {
    const existed = existsSync(macApp());
    rmSync(macApp(), { recursive: true, force: true });
    info(existed ? `${style.green("✔")} removed ${tildify(macApp())}` : "claudegrid.app was not installed");
    return;
  }
  const removed = [entryPath(), iconPath()].filter((p) => existsSync(p));
  for (const path of removed) rmSync(path);
  spawnSync("update-desktop-database", [join(dataHome(), "applications")], { stdio: "ignore" });
  info(removed.length ? `${style.green("✔")} removed claudegrid from your app menu` : "claudegrid was not in your app menu");
}
