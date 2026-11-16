import type { BackendName } from "../config.js";
import { CliError } from "../ui.js";
import { kitty } from "./kitty.js";
import { konsole } from "./konsole.js";
import { tmux } from "./tmux.js";
import type { Backend, TerminalName } from "./types.js";
import { wezterm } from "./wezterm.js";

export const BACKEND_LIST: Backend[] = [konsole, tmux, kitty, wezterm];
export const backendByName = (name: TerminalName) => BACKEND_LIST.find((b) => b.name === name)!;

/** Fallback order when claudegrid runs outside all supported terminals: GUI windows first, tmux last. */
const FALLBACK: TerminalName[] = ["konsole", "kitty", "wezterm", "tmux"];

export function pickBackend(name: BackendName, env: NodeJS.ProcessEnv = process.env): Backend {
  if (name !== "auto") {
    const backend = backendByName(name);
    const status = backend.check();
    if (!status.ok) throw new CliError(`the ${backend.label} backend is not usable: ${status.detail}`, "run `claudegrid doctor` to see which terminals work here");
    return backend;
  }
  // The terminal we are already in wins. tmux comes first because it can run inside any of the others.
  const current = [tmux, kitty, wezterm, konsole].find((b) => b.isCurrent(env) && b.check().ok);
  if (current) return current;
  for (const candidate of FALLBACK) {
    const backend = backendByName(candidate);
    if (backend.check().ok) return backend;
  }
  throw new CliError("no supported terminal found", "install tmux, or run claudegrid from Konsole, kitty or WezTerm. `claudegrid doctor` shows what is missing");
}

export type { Backend, TerminalName } from "./types.js";
