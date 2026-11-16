import type { BackendName } from "../config.js";
import { CliError } from "../ui.js";
import { iterm2 } from "./iterm2.js";
import { kitty } from "./kitty.js";
import { konsole } from "./konsole.js";
import { terminal } from "./terminal.js";
import { tmux } from "./tmux.js";
import type { Backend, TerminalName } from "./types.js";
import { wezterm } from "./wezterm.js";

export const BACKEND_LIST: Backend[] = [konsole, iterm2, tmux, kitty, wezterm, terminal];
export const backendByName = (name: TerminalName) => BACKEND_LIST.find((b) => b.name === name)!;

/** Fallback order when claudegrid runs outside a terminal that splits: GUI splits first, then tmux, then tiled Terminal.app windows. */
const FALLBACK: TerminalName[] = ["konsole", "iterm2", "kitty", "wezterm", "tmux", "terminal"];

/** `preview` skips the availability check for a named backend, so a dry run can show any terminal. */
export function pickBackend(name: BackendName, env: NodeJS.ProcessEnv = process.env, preview = false): Backend {
  if (name !== "auto") {
    const backend = backendByName(name);
    if (preview) return backend;
    const status = backend.check();
    if (!status.ok) throw new CliError(`the ${backend.label} backend is not usable: ${status.detail}`, "run `claudegrid doctor` to see which terminals work here");
    return backend;
  }
  // The terminal we are already in wins. tmux comes first because it can run inside any of the others.
  const current = [tmux, kitty, wezterm, iterm2, konsole].find((b) => b.isCurrent(env) && b.check().ok);
  if (current) return current;
  for (const candidate of FALLBACK) {
    const backend = backendByName(candidate);
    if (backend.check().ok) return backend;
  }
  throw new CliError("no supported terminal found", "install tmux, or run claudegrid from Konsole, iTerm2, kitty, WezTerm or macOS Terminal. `claudegrid doctor` shows what is missing");
}

export type { Backend, TerminalName } from "./types.js";
