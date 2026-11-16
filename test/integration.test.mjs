import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { cleanEnv, cli, gitRepo, has, sandbox } from "./helpers.mjs";

const waitFor = (path, lines, timeout = 8000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (existsSync(path) && readFileSync(path, "utf8").trim().split("\n").length >= lines) return readFileSync(path, "utf8").trim().split("\n").sort();
    spawnSync("sleep", ["0.1"]);
  }
  assert.fail(`timed out waiting for ${lines} lines in ${path}`);
};

/** Each pane appends its number, name and working directory, then waits a little so the layout can be inspected. */
const probe = (out) => ["--no-keep-shell", "--command", "sh", "--", "-c", `echo "$CLAUDEGRID_PANE $CLAUDEGRID_PANE_NAME $(pwd)" >> ${out}; sleep 2`];

test("tmux: real 3x2 grid with panes in reading order", { skip: !has("tmux") && "tmux missing" }, () => {
  // A short private socket dir keeps this away from the developer's tmux server.
  const socketDir = mkdtempSync("/tmp/cg-");
  const env = { TMUX_TMPDIR: socketDir, TMUX: "" };
  try {
    const dir = sandbox();
    const out = join(dir, "out");
    const result = cli(["-b", "tmux", "-l", "3x2", "-t", "itest", "--detach", ...probe(out)], { cwd: dir, env });
    assert.equal(result.code, 0, result.stderr);
    const layout = execFileSync("tmux", ["list-panes", "-t", "claudegrid-itest", "-F", "#{pane_left} #{pane_top} #{@claudegrid_name}"], { env: { ...process.env, ...env }, encoding: "utf8" });
    const panes = layout.trim().split("\n").map((l) => l.split(" "));
    const byTitle = Object.fromEntries(panes.map(([x, y, , n]) => [n, [Number(x), Number(y)]]));
    assert.ok(byTitle[1][0] < byTitle[2][0] && byTitle[2][0] < byTitle[3][0], "top row goes left to right");
    assert.equal(byTitle[1][0], byTitle[4][0], "pane 4 sits under pane 1");
    assert.ok(byTitle[4][1] > byTitle[1][1]);
    assert.deepEqual(waitFor(out, 6), [1, 2, 3, 4, 5, 6].map((i) => `${i} pane-${i} ${dir}`).sort());
  } finally {
    spawnSync("tmux", ["kill-server"], { env: { ...process.env, TMUX_TMPDIR: socketDir } });
    rmSync(socketDir, { recursive: true, force: true });
  }
});

test("tmux: worktrees give each pane its own branch", { skip: !has("tmux") && "tmux missing" }, () => {
  const socketDir = mkdtempSync("/tmp/cg-");
  const env = { TMUX_TMPDIR: socketDir, TMUX: "" };
  try {
    const repo = gitRepo();
    const out = join(sandbox(), "branches");
    const result = cli(["-b", "tmux", "-w", "-n", "2", "--detach", "--no-keep-shell", "--command", "sh", "--", "-c", `git branch --show-current >> ${out}`], { cwd: repo, env });
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(waitFor(out, 2), ["claudegrid/grid/pane-1", "claudegrid/grid/pane-2"]);
    assert.match(cli(["worktrees"], { cwd: repo }).stdout, /claudegrid\/grid\/pane-1\s+clean/);
    assert.equal(cli(["worktrees", "clean"], { cwd: repo }).code, 0);
    assert.equal(cli(["worktrees"], { cwd: repo }).stdout.trim(), "");
  } finally {
    spawnSync("tmux", ["kill-server"], { env: { ...process.env, TMUX_TMPDIR: socketDir } });
    rmSync(socketDir, { recursive: true, force: true });
  }
});

test("konsole: real grid, offscreen", { skip: process.env.CLAUDEGRID_TEST_KONSOLE !== "1" && "set CLAUDEGRID_TEST_KONSOLE=1" }, () => {
  const dir = sandbox();
  const out = join(dir, "out");
  const result = cli(["-b", "konsole", "-n", "5", ...probe(out)], { cwd: dir, env: { QT_QPA_PLATFORM: "offscreen" } });
  assert.equal(result.code, 0, result.stderr);
  const pid = /pid (\d+)/.exec(result.stderr)?.[1];
  try {
    assert.deepEqual(waitFor(out, 5), [1, 2, 3, 4, 5].map((i) => `${i} pane-${i} ${dir}`).sort());
  } finally {
    if (pid) process.kill(Number(pid));
  }
});

test("konsole: a new tab in an open window, offscreen", { skip: process.env.CLAUDEGRID_TEST_KONSOLE !== "1" && "set CLAUDEGRID_TEST_KONSOLE=1" }, async () => {
  const { ensureTabProfile } = await import("../dist/backends/konsole.js");
  const data = sandbox();
  // Profiles and the tab script go to a throwaway XDG_DATA_HOME, so the developer's Konsole is untouched.
  const env = cleanEnv({ XDG_DATA_HOME: data, QT_QPA_PLATFORM: "offscreen" });
  process.env.XDG_DATA_HOME = data;
  ensureTabProfile([process.execPath, new URL("../dist/cli.js", import.meta.url).pathname, "pane"]);
  delete process.env.XDG_DATA_HOME;
  const konsole = spawn("konsole", ["--separate", "--nofork"], { env, stdio: "ignore" });
  const service = `org.kde.konsole-${konsole.pid}`;
  try {
    for (let i = 0; i < 100 && spawnSync("qdbus6", [service, "/Windows/1"]).status !== 0; i++) spawnSync("sleep", ["0.1"]);
    const dir = sandbox();
    const out = join(dir, "out");
    const result = cli(["-b", "konsole", "-l", "2x2", ...probe(out)], { cwd: dir, env: { XDG_DATA_HOME: data, KONSOLE_DBUS_SERVICE: service, KONSOLE_DBUS_WINDOW: "/Windows/1" } });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stderr, /opened a new Konsole tab/);
    assert.deepEqual(waitFor(out, 4), [1, 2, 3, 4].map((i) => `${i} pane-${i} ${dir}`).sort());
    const tabs = spawnSync("qdbus6", [service, "/Windows/1", "org.kde.konsole.Window.viewHierarchy"], { encoding: "utf8" }).stdout.trim().split("\n");
    assert.equal(tabs.length, 2, "the grid is a second tab next to the original one");
  } finally {
    konsole.kill();
  }
});

