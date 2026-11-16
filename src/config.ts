import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { CliError, didYouMean } from "./ui.js";

export const BACKENDS = ["auto", "konsole", "iterm2", "tmux", "kitty", "wezterm", "terminal"] as const;
export type BackendName = (typeof BACKENDS)[number];

export const PROJECT_CONFIG_NAMES = [".claudegrid.json", "claudegrid.json"];
export const SCHEMA_URL = "https://halitsever.github.io/claudegrid/schema.json";

export interface PaneConfig {
  name?: string;
  dir?: string;
  prompt?: string;
  model?: string;
  args?: string[];
}

export interface GridConfig {
  layout?: string;
  panes?: number | PaneConfig[];
  backend?: BackendName;
  worktrees?: boolean;
  model?: string;
  args?: string[];
  command?: string;
  keepShell?: boolean;
  /** Open the grid as a tab in the terminal claudegrid runs in, instead of a new window. */
  newTab?: boolean;
  /** Mark pane folders as trusted in Claude Code so it skips the safety question. */
  trust?: boolean;
  dir?: string;
}

export interface PresetConfig extends GridConfig {
  /** Shown by `claudegrid presets`. */
  description?: string;
}

export interface ConfigFile extends GridConfig {
  $schema?: string;
  presets?: Record<string, PresetConfig>;
}

export interface LoadedConfig {
  path: string;
  /** Directory the config lives in. Relative pane dirs resolve against it. */
  base: string;
  data: ConfigFile;
}

const GRID_KEYS = ["layout", "panes", "backend", "worktrees", "model", "args", "command", "keepShell", "newTab", "trust", "dir"];
const FILE_KEYS = [...GRID_KEYS, "$schema", "presets"];
const PANE_KEYS = ["name", "dir", "prompt", "model", "args"];

type Json = unknown;

const isObject = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);

function fail(file: string, path: string, message: string, hint?: string): never {
  throw new CliError(`${file}: ${path ? `${path} ` : ""}${message}`, hint);
}

function checkKeys(file: string, path: string, obj: Record<string, Json>, allowed: string[]): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) fail(file, path, `has an unknown key "${key}"`, didYouMean(key, allowed) ?? `allowed keys: ${allowed.join(", ")}`);
  }
}

function checkString(file: string, path: string, v: Json): void {
  if (typeof v !== "string" || v === "") fail(file, path, "must be a non-empty string");
}

function checkStringArray(file: string, path: string, v: Json): void {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) fail(file, path, "must be an array of strings");
}

function validateGrid(file: string, path: string, obj: Record<string, Json>, allowed: string[]): void {
  checkKeys(file, path, obj, allowed);
  const at = (k: string) => (path ? `${path}.${k}` : k);
  for (const k of ["layout", "model", "command", "dir"]) if (k in obj) checkString(file, at(k), obj[k]);
  if ("args" in obj) checkStringArray(file, at("args"), obj.args);
  for (const k of ["worktrees", "keepShell", "newTab", "trust"]) if (k in obj && typeof obj[k] !== "boolean") fail(file, at(k), "must be true or false");
  if ("backend" in obj && !BACKENDS.includes(obj.backend as BackendName)) {
    fail(file, at("backend"), `must be one of ${BACKENDS.join(", ")}`, typeof obj.backend === "string" ? didYouMean(obj.backend, BACKENDS) : undefined);
  }
  if ("panes" in obj) {
    const panes = obj.panes;
    if (typeof panes === "number") {
      if (!Number.isInteger(panes) || panes < 1) fail(file, at("panes"), "must be a positive whole number or an array of panes");
    } else if (Array.isArray(panes)) {
      panes.forEach((pane, i) => {
        const p = `${at("panes")}[${i}]`;
        if (typeof pane === "string") return;
        if (!isObject(pane)) fail(file, p, "must be an object or a prompt string");
        checkKeys(file, p, pane, PANE_KEYS);
        for (const k of ["name", "dir", "prompt", "model"]) if (k in pane) checkString(file, `${p}.${k}`, pane[k]);
        if ("args" in pane) checkStringArray(file, `${p}.args`, pane.args);
      });
    } else {
      fail(file, at("panes"), "must be a number or an array of panes");
    }
  }
}

/** Validates parsed JSON and normalizes shorthand forms (a pane given as a bare string is its prompt). */
export function validateConfig(file: string, data: Json): ConfigFile {
  if (!isObject(data)) fail(file, "", "must contain a JSON object");
  validateGrid(file, "", data, FILE_KEYS);
  if ("presets" in data) {
    if (!isObject(data.presets)) fail(file, "presets", "must be an object of named presets");
    for (const [name, preset] of Object.entries(data.presets)) {
      if (!/^[A-Za-z0-9][\w.-]*$/.test(name)) fail(file, `presets.${name}`, "is not a valid preset name", "use letters, digits, dots, dashes and underscores");
      if (!isObject(preset)) fail(file, `presets.${name}`, "must be an object");
      validateGrid(file, `presets.${name}`, preset, [...GRID_KEYS, "description"]);
      if ("description" in preset) checkString(file, `presets.${name}.description`, preset.description);
    }
  }
  const normalize = (grid: Record<string, Json>) => {
    if (Array.isArray(grid.panes)) grid.panes = grid.panes.map((p) => (typeof p === "string" ? { prompt: p } : p));
  };
  normalize(data);
  if (isObject(data.presets)) for (const preset of Object.values(data.presets)) normalize(preset as Record<string, Json>);
  return data as ConfigFile;
}

export function readConfig(path: string): LoadedConfig {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    throw new CliError(`cannot read config ${path}: ${(error as Error).message}`);
  }
  let data: Json;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new CliError(`${path} is not valid JSON: ${(error as Error).message}`);
  }
  return { path, base: dirname(path), data: validateConfig(path, data) };
}

/** Walks up from `start` and returns the first project config found. */
export function findProjectConfig(start: string): string | undefined {
  let dir = resolve(start);
  for (;;) {
    for (const name of PROJECT_CONFIG_NAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export function userConfigPath(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "claudegrid", "config.json");
}

export interface ConfigSources {
  user?: LoadedConfig;
  project?: LoadedConfig;
}

export function loadConfigs(cwd: string, explicit?: string): ConfigSources {
  const userPath = userConfigPath();
  const user = existsSync(userPath) ? readConfig(userPath) : undefined;
  if (explicit) return { user, project: readConfig(resolve(cwd, explicit)) };
  const projectPath = findProjectConfig(cwd);
  return { user, project: projectPath ? readConfig(projectPath) : undefined };
}

export function presetNames(sources: ConfigSources): string[] {
  return [...new Set([...Object.keys(sources.project?.data.presets ?? {}), ...Object.keys(sources.user?.data.presets ?? {})])].sort();
}

/** A grid config whose relative paths are already absolute. */
export type ResolvedGrid = GridConfig;

function absolutize(grid: GridConfig, base: string): ResolvedGrid {
  const out: ResolvedGrid = { ...grid };
  if (out.dir) out.dir = resolve(base, out.dir);
  if (Array.isArray(out.panes)) out.panes = out.panes.map((p) => (p.dir ? { ...p, dir: resolve(base, p.dir) } : { ...p }));
  return out;
}

function pickGrid(data: ConfigFile): GridConfig {
  const { $schema: _schema, presets: _presets, ...grid } = data;
  return grid;
}

/**
 * Merges config layers, later ones winning. `args` from every layer add up so a preset can extend the
 * project's flags instead of replacing them.
 */
export function mergeGrids(...layers: ResolvedGrid[]): ResolvedGrid {
  const out: ResolvedGrid = {};
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer) as [keyof ResolvedGrid, unknown][]) {
      if (value === undefined) continue;
      if (key === "args") out.args = [...(out.args ?? []), ...(value as string[])];
      else (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

export function resolveLayers(sources: ConfigSources, preset: string | undefined): ResolvedGrid[] {
  const layers: ResolvedGrid[] = [];
  const cwd = process.cwd();
  if (sources.user) layers.push(absolutize(pickGrid(sources.user.data), cwd));
  if (sources.project) layers.push(absolutize(pickGrid(sources.project.data), sources.project.base));
  if (preset) {
    const fromProject = sources.project?.data.presets?.[preset];
    const fromUser = sources.user?.data.presets?.[preset];
    const strip = ({ description: _description, ...grid }: PresetConfig): GridConfig => grid;
    if (fromProject) layers.push(absolutize(strip(fromProject), sources.project!.base));
    else if (fromUser) layers.push(absolutize(strip(fromUser), cwd));
    else {
      const names = presetNames(sources);
      throw new CliError(
        `unknown preset "${preset}"`,
        didYouMean(preset, names) ?? (names.length ? `available presets: ${names.join(", ")}` : "define presets in .claudegrid.json (run `claudegrid init`)"),
      );
    }
  }
  return layers;
}

export function userHome(): string {
  return process.env.HOME || homedir();
}
