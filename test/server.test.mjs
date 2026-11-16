import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { startUiServer } from "../dist/server/index.js";
import { gitRepo, has, sandbox, writeConfig } from "./helpers.mjs";

let server, repo, base;
const api = async (method, path, body, headers = {}) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", "x-claudegrid-token": server.token, ...headers }, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};
/** fetch refuses to set Host, so the rebinding check goes through http.request. */
const withHost = (host) =>
  new Promise((done) => {
    const req = request({ host: "127.0.0.1", port: server.port, path: "/api/state", headers: { host, "x-claudegrid-token": server.token } }, (res) => done(res.statusCode));
    req.end();
  });

before(async () => {
  repo = gitRepo();
  mkdirSync(join(repo, "web"));
  writeConfig(repo, { model: "sonnet", panes: [{ name: "api" }, { name: "web", dir: "web" }], presets: { review: { description: "r", panes: 3 } } });
  server = await startUiServer({ cwd: repo, version: "test" });
  base = `http://127.0.0.1:${server.port}`;
});
after(() => server.close());

test("the page needs the token from the printed link", async () => {
  assert.equal((await fetch(base + "/")).status, 403);
  const page = await fetch(server.url);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, new RegExp(`"token":"${server.token}"`));
  assert.match(page.headers.get("content-security-policy"), /default-src 'none'/);
});

test("the api rejects missing tokens, other hosts and other origins", async () => {
  assert.equal((await fetch(base + "/api/state")).status, 403);
  assert.equal((await api("GET", "/api/state", undefined, { "x-claudegrid-token": "nope" })).status, 403);
  assert.equal(await withHost("evil.example:" + server.port), 403);
  assert.equal(await withHost(`localhost:${server.port}`), 200);
  assert.equal((await api("POST", "/api/ping", {}, { origin: "http://evil.example" })).status, 403);
});

test("state lists the project config, presets and terminals", async () => {
  const { status, body } = await api("GET", `/api/state?cwd=${encodeURIComponent(repo)}`);
  assert.equal(status, 200);
  assert.equal(body.projectConfig, join(repo, ".claudegrid.json"));
  assert.deepEqual(body.presets.map((p) => p.name), ["review"]);
  assert.ok(body.doctor.terminals.some((t) => t.name === "tmux"));
});

test("resolve merges the project config with a preset", async () => {
  const plain = await api("GET", `/api/resolve?cwd=${encodeURIComponent(repo)}`);
  assert.equal(plain.body.grid.model, "sonnet");
  assert.equal(plain.body.grid.panes[1].dir, join(repo, "web"));
  const review = await api("GET", `/api/resolve?cwd=${encodeURIComponent(repo)}&preset=review`);
  assert.equal(review.body.grid.panes, 3);
});

test("plan validates like the cli and expands ~", { skip: !has("tmux") && "tmux missing" }, async () => {
  const ok = await api("POST", "/api/plan", { cwd: repo, grid: { layout: "2x1", backend: "tmux", panes: [{ name: "a", prompt: "hi" }, { dir: "web" }] } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.deepEqual(ok.body.plan.panes[0].command, ["claude", "hi"]);
  assert.equal(ok.body.plan.panes[1].cwd, join(repo, "web"));
  assert.ok(ok.body.steps.some((s) => s.startsWith("tmux new-session")));
  const bad = await api("POST", "/api/plan", { cwd: repo, grid: { layout: "2x1", panes: [{ name: "x" }, { name: "x" }] } });
  assert.equal(bad.status, 400);
  assert.match(bad.body.error, /two panes are named "x"/);
  const typo = await api("POST", "/api/plan", { cwd: repo, grid: { backend: "tmuxx" } });
  assert.match(typo.body.hint, /did you mean "tmux"/);
});

test("saving writes valid config with paths relative to the file", async () => {
  const grid = { layout: "2x1", model: "opus", panes: [{ name: "a", dir: join(repo, "web") }, { prompt: "p" }] };
  assert.equal((await api("POST", "/api/config", { cwd: repo, mode: "preset", name: "duo", description: "two", grid })).status, 200);
  assert.equal((await api("POST", "/api/config", { cwd: repo, mode: "grid", grid: { layout: "3x1" } })).status, 200);
  const saved = JSON.parse(readFileSync(join(repo, ".claudegrid.json"), "utf8"));
  assert.equal(saved.$schema, "https://halitsever.github.io/claudegrid/schema.json");
  assert.equal(saved.layout, "3x1");
  assert.equal(saved.model, undefined, "project defaults are replaced, not merged");
  assert.deepEqual(saved.presets.duo, { description: "two", layout: "2x1", model: "opus", panes: [{ name: "a", dir: "web" }, { prompt: "p" }] });
  assert.ok(saved.presets.review, "other presets stay");
  assert.equal((await api("POST", "/api/config", { cwd: repo, mode: "preset", name: "", grid })).status, 400);
});

test("folders list with git and config markers", async () => {
  const { body } = await api("GET", `/api/dirs?path=${encodeURIComponent(join(repo, ".."))}`);
  const entry = body.dirs.find((d) => d.path === repo);
  assert.deepEqual([entry.git, entry.config], [true, true]);
  assert.equal((await api("GET", "/api/dirs?path=/definitely/not/here")).status, 400);
});

test("launching from the ui starts a real tmux grid", { skip: !has("tmux") && "tmux missing" }, async () => {
  const socketDir = mkdtempSync("/tmp/cg-");
  const saved = { TMUX_TMPDIR: process.env.TMUX_TMPDIR, TMUX: process.env.TMUX };
  process.env.TMUX_TMPDIR = socketDir;
  delete process.env.TMUX;
  try {
    const out = join(sandbox(), "out");
    const grid = { layout: "2x1", backend: "tmux", keepShell: false, command: "sh", args: ["-c", `echo "$CLAUDEGRID_PANE_NAME" >> ${out}`], panes: [{ name: "left" }, { name: "right" }] };
    const res = await api("POST", "/api/launch", { cwd: sandbox(), grid });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.match(res.body.message, /started tmux session claudegrid-/);
    for (let i = 0; i < 80; i++) {
      try {
        if (readFileSync(out, "utf8").trim().split("\n").length >= 2) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.deepEqual(readFileSync(out, "utf8").trim().split("\n").sort(), ["left", "right"]);
  } finally {
    spawnSync("tmux", ["kill-server"], { env: { ...process.env } });
    Object.assign(process.env, saved);
    if (saved.TMUX === undefined) delete process.env.TMUX;
    if (saved.TMUX_TMPDIR === undefined) delete process.env.TMUX_TMPDIR;
    rmSync(socketDir, { recursive: true, force: true });
  }
});

test("worktrees answer for repos and plain folders", async () => {
  assert.deepEqual((await api("GET", `/api/worktrees?cwd=${encodeURIComponent(repo)}`)).body, { git: true, worktrees: [] });
  assert.equal((await api("GET", `/api/worktrees?cwd=${encodeURIComponent(sandbox())}`)).body.git, false);
});
