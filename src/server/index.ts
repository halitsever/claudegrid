import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { pickBackend } from "../backends/index.js";
import { collectDoctor, type DoctorReport } from "../commands/doctor.js";
import { dryRunSteps, executeLaunch, planFromOptions, planJson } from "../commands/launch.js";
import { cleanWorktreeData, worktreeData } from "../commands/worktrees.js";
import { findProjectConfig, loadConfigs, mergeGrids, readConfig, resolveLayers, SCHEMA_URL, validateConfig, type ConfigFile, type GridConfig } from "../config.js";
import { gitRoot } from "../git.js";
import { CliError } from "../ui.js";
import { addRecent, readRecent } from "./recent.js";

export interface UiServer {
  url: string;
  port: number;
  token: string;
  close(): Promise<void>;
}

export interface UiServerOptions {
  cwd: string;
  port?: number;
  version: string;
  /** Called after the page stopped sending heartbeats, so a desktop launch does not leave a server behind. */
  onIdle?: () => void;
}

const IDLE_MS = 45_000;
const FIRST_VISIT_MS = 180_000;
const MAX_BODY = 1_000_000;

class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly hint?: string) {
    super(message);
  }
}

function sameToken(a: string | undefined, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new HttpError(413, "request body is too large");
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("not an object");
    return data;
  } catch {
    throw new HttpError(400, "request body must be a JSON object");
  }
}

function directory(value: unknown): string {
  if (typeof value !== "string" || !value) throw new HttpError(400, "missing project folder");
  const dir = resolve(value.replace(/^~(?=$|\/)/, homedir()));
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new HttpError(400, `${dir} is not a folder`);
  return dir;
}

/** Turns absolute pane folders back into paths relative to the config file, so the config works on other machines. */
function relativize(grid: GridConfig, base: string): GridConfig {
  const rel = (dir: string) => {
    if (!isAbsolute(dir)) return dir;
    const r = relative(base, dir);
    return r.startsWith("..") || isAbsolute(r) ? dir : r || ".";
  };
  const out: GridConfig = { ...grid };
  if (out.dir) out.dir = rel(out.dir);
  if (Array.isArray(out.panes)) out.panes = out.panes.map((p) => (p.dir ? { ...p, dir: rel(p.dir) } : p));
  return out;
}

const GRID_KEYS: (keyof GridConfig)[] = ["layout", "panes", "backend", "worktrees", "model", "args", "command", "keepShell", "dir"];

function cleanGrid(input: unknown): GridConfig {
  if (typeof input !== "object" || input === null) throw new HttpError(400, "missing grid settings");
  const grid: Record<string, unknown> = {};
  for (const key of GRID_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined && value !== "" && !(Array.isArray(value) && key === "args" && !value.length)) grid[key] = value;
  }
  // The same checks as a config file, so the UI gets the same error messages.
  const valid = validateConfig("settings", grid) as GridConfig;
  const home = (dir: string) => dir.replace(/^~(?=$|\/)/, homedir());
  if (valid.dir) valid.dir = home(valid.dir);
  if (Array.isArray(valid.panes)) valid.panes = valid.panes.map((p) => (p.dir ? { ...p, dir: home(p.dir) } : p));
  return valid;
}

export async function startUiServer(options: UiServerOptions): Promise<UiServer> {
  const token = randomBytes(24).toString("base64url");
  const page = readFileSync(new URL("../../assets/ui.html", import.meta.url), "utf8");
  let port = 0;
  let lastPing = 0;
  const startedAt = Date.now();
  let doctorCache: { at: number; cwd: string; report: DoctorReport } | undefined;

  const doctor = (cwd: string, fresh = false) => {
    if (fresh || !doctorCache || doctorCache.cwd !== cwd || Date.now() - doctorCache.at > 30_000) doctorCache = { at: Date.now(), cwd, report: collectDoctor(cwd) };
    return doctorCache.report;
  };

  const routes: Record<string, (req: IncomingMessage, url: URL) => Promise<unknown> | unknown> = {
    "POST /api/ping": () => {
      lastPing = Date.now();
      return {};
    },

    "GET /api/state": (_req, url) => {
      const cwd = directory(url.searchParams.get("cwd") || options.cwd);
      const sources = (() => {
        try {
          return { value: loadConfigs(cwd) };
        } catch (error) {
          return { error: error as CliError };
        }
      })();
      const presets = sources.value
        ? [
            ...Object.entries(sources.value.project?.data.presets ?? {}).map(([name, p]) => ({ name, description: p.description, source: "project" })),
            ...Object.entries(sources.value.user?.data.presets ?? {})
              .filter(([name]) => !sources.value!.project?.data.presets?.[name])
              .map(([name, p]) => ({ name, description: p.description, source: "user" })),
          ].sort((a, b) => a.name.localeCompare(b.name))
        : [];
      return {
        version: options.version,
        cwd,
        home: homedir(),
        gitRoot: gitRoot(cwd) ?? null,
        projectConfig: sources.value?.project?.path ?? findProjectConfig(cwd) ?? null,
        configError: sources.error ? { error: sources.error.message, hint: sources.error.hint } : null,
        presets,
        doctor: doctor(cwd),
        recent: readRecent(),
      };
    },

    "GET /api/resolve": (_req, url) => {
      const cwd = directory(url.searchParams.get("cwd"));
      const preset = url.searchParams.get("preset") || undefined;
      return { grid: mergeGrids(...resolveLayers(loadConfigs(cwd), preset)) };
    },

    "POST /api/plan": async (req) => {
      const body = await readJson(req);
      const cwd = directory(body.cwd);
      const preset = typeof body.preset === "string" && body.preset ? body.preset : undefined;
      const plan = planFromOptions({ cwd, preset, grid: cleanGrid(body.grid), prompts: [], extraArgs: [], dryRun: true, json: false, detach: true });
      const backend = pickBackend(plan.backend);
      return { plan: planJson(plan, backend), backendLabel: backend.label, steps: await dryRunSteps(plan, backend) };
    },

    "POST /api/launch": async (req) => {
      const body = await readJson(req);
      const cwd = directory(body.cwd);
      const preset = typeof body.preset === "string" && body.preset ? body.preset : undefined;
      const plan = planFromOptions({ cwd, preset, grid: cleanGrid(body.grid), prompts: [], extraArgs: [], dryRun: false, json: false, detach: true });
      const result = await executeLaunch(plan, pickBackend(plan.backend), { detach: true, interactive: false });
      addRecent(cwd);
      return result;
    },

    "GET /api/dirs": (_req, url) => {
      const dir = directory(url.searchParams.get("path") || homedir());
      const showHidden = url.searchParams.get("hidden") === "1";
      const dirs = readdirSync(dir, { withFileTypes: true })
        .filter((e) => (e.isDirectory() || e.isSymbolicLink()) && (showHidden || !e.name.startsWith(".")))
        .map((e) => join(dir, e.name))
        .filter((p) => {
          try {
            return statSync(p).isDirectory();
          } catch {
            return false;
          }
        })
        .map((p) => ({ name: p.slice(dir.length + (dir.endsWith("/") ? 0 : 1)), path: p, git: existsSync(join(p, ".git")), config: existsSync(join(p, ".claudegrid.json")) || existsSync(join(p, "claudegrid.json")) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { path: dir, parent: dirname(dir) === dir ? null : dirname(dir), home: homedir(), git: existsSync(join(dir, ".git")), dirs };
    },

    "POST /api/config": async (req) => {
      const body = await readJson(req);
      const cwd = directory(body.cwd);
      const path = findProjectConfig(cwd) ?? join(gitRoot(cwd) ?? cwd, ".claudegrid.json");
      const data: ConfigFile = existsSync(path) ? readConfig(path).data : { $schema: SCHEMA_URL };
      const grid = relativize(cleanGrid(body.grid), dirname(path));
      if (body.mode === "preset") {
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) throw new HttpError(400, "the preset needs a name");
        const description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : undefined;
        data.presets = { ...(data.presets ?? {}), [name]: { ...(description ? { description } : {}), ...grid } };
      } else {
        for (const key of GRID_KEYS) delete data[key];
        Object.assign(data, grid);
      }
      const ordered: ConfigFile = { $schema: data.$schema ?? SCHEMA_URL, ...data };
      validateConfig(path, JSON.parse(JSON.stringify(ordered)));
      writeFileSync(path, JSON.stringify(ordered, null, 2) + "\n");
      return { path };
    },

    "GET /api/worktrees": (_req, url) => {
      const cwd = directory(url.searchParams.get("cwd"));
      if (!gitRoot(cwd)) return { git: false, worktrees: [] };
      return { git: true, worktrees: worktreeData(cwd) };
    },

    "POST /api/worktrees/clean": async (req) => {
      const body = await readJson(req);
      const branches = Array.isArray(body.branches) ? body.branches.filter((b): b is string => typeof b === "string") : undefined;
      return { results: cleanWorktreeData(directory(body.cwd), { force: body.force === true, keepBranches: body.keepBranches === true, dryRun: false, branches }) };
    },

    "POST /api/doctor": async (req) => {
      const body = await readJson(req);
      return doctor(directory(body.cwd), true);
    },
  };

  const server = createServer(async (req, res: ServerResponse) => {
    const send = (status: number, body: unknown, type = "application/json") => {
      res.writeHead(status, {
        "content-type": `${type}; charset=utf-8`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        ...(type === "text/html" ? { "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } : {}),
      });
      res.end(type === "application/json" ? JSON.stringify(body) : String(body));
    };
    try {
      // Only the exact host we listen on, which stops DNS rebinding from another site.
      const host = req.headers.host ?? "";
      if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) throw new HttpError(403, "unexpected host");
      const url = new URL(req.url ?? "/", `http://${host}`);

      if (req.method === "GET" && url.pathname === "/") {
        if (!sameToken(url.searchParams.get("t") ?? undefined, token)) throw new HttpError(403, "open the link printed by `claudegrid ui`");
        const cwd = options.cwd;
        send(200, page.replace("__CLAUDEGRID_BOOT__", JSON.stringify({ token, cwd, version: options.version }).replace(/</g, "\\u003c")), "text/html");
        return;
      }

      const origin = req.headers.origin;
      if (origin && origin !== `http://${host}`) throw new HttpError(403, "cross-origin requests are not allowed");
      if (!sameToken(req.headers["x-claudegrid-token"] as string | undefined, token)) throw new HttpError(403, "missing or wrong token");
      const route = routes[`${req.method} ${url.pathname}`];
      if (!route) throw new HttpError(404, "not found");
      send(200, (await route(req, url)) ?? {});
    } catch (error) {
      if (error instanceof HttpError) send(error.status, { error: error.message, hint: error.hint });
      else if (error instanceof CliError) send(400, { error: error.message, hint: error.hint });
      else send(500, { error: (error as Error).message });
    }
  });

  await new Promise<void>((done, fail) => {
    server.once("error", (error: NodeJS.ErrnoException) =>
      fail(error.code === "EADDRINUSE" ? new CliError(`port ${options.port} is already in use`, "pick another with --port, or leave it out to get a free one") : error),
    );
    server.listen(options.port ?? 0, "127.0.0.1", () => done());
  });
  port = (server.address() as AddressInfo).port;

  const timer = options.onIdle
    ? setInterval(() => {
        const now = Date.now();
        if ((lastPing && now - lastPing > IDLE_MS) || (!lastPing && now - startedAt > FIRST_VISIT_MS)) options.onIdle!();
      }, 5000)
    : undefined;
  timer?.unref();

  return {
    url: `http://127.0.0.1:${port}/?t=${token}`,
    port,
    token,
    close: () =>
      new Promise((done) => {
        if (timer) clearInterval(timer);
        server.closeAllConnections?.();
        server.close(() => done());
      }),
  };
}
