import { spawn } from "node:child_process";
import { which } from "../exec.js";

/** Chromium based browsers can show the UI as its own app window, without tabs or an address bar. */
const APP_BROWSERS = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "brave-browser", "microsoft-edge"];

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

export function openUi(url: string): string | undefined {
  const custom = process.env.CLAUDEGRID_BROWSER;
  if (custom) return detached(custom, [url]) ? custom : undefined;
  for (const browser of APP_BROWSERS) {
    if (which(browser) && detached(browser, [`--app=${url}`, "--class=claudegrid"])) return browser;
  }
  const opener = process.platform === "darwin" ? "open" : "xdg-open";
  return which(opener) && detached(opener, [url]) ? opener : undefined;
}
