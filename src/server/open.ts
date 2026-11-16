import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { which } from "../exec.js";

/** Chromium based browsers can show the UI as its own app window, without tabs or an address bar. */
const APP_BROWSERS = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "brave-browser", "microsoft-edge"];
const MAC_APP_BROWSERS = ["Google Chrome", "Chromium", "Brave Browser", "Microsoft Edge", "Arc"];

function detached(command: string, args: string[]): boolean {
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

const macAppInstalled = (name: string) => ["/Applications", join(homedir(), "Applications")].some((dir) => existsSync(join(dir, `${name}.app`)));

export function openUi(url: string): string | undefined {
  const custom = process.env.CLAUDEGRID_BROWSER;
  if (custom) return detached(custom, [url]) ? custom : undefined;
  if (process.platform === "darwin") {
    // -n starts a fresh instance, which is the only way to pass --app to a browser that is already open.
    const app = MAC_APP_BROWSERS.find(macAppInstalled);
    if (app && detached("open", ["-na", app, "--args", `--app=${url}`])) return app;
    return detached("open", [url]) ? "your default browser" : undefined;
  }
  for (const browser of APP_BROWSERS) {
    if (which(browser) && detached(browser, [`--app=${url}`, "--class=claudegrid"])) return browser;
  }
  return which("xdg-open") && detached("xdg-open", [url]) ? "xdg-open" : undefined;
}
