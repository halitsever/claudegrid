import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { cli, gitRepo, has, sandbox, writeConfig } from "./helpers.mjs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("--version and --help", () => {
  assert.equal(cli(["--version"]).stdout.trim(), pkg.version);
  const help = cli(["--help"]);
  assert.equal(help.code, 0);
  for (const word of ["--layout", "--worktrees", "doctor", "completion"]) assert.ok(help.stdout.includes(word), word);
});

test("unknown flags point at the -- separator", () => {
  const result = cli(["--continue"]);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /unknown option '--continue'/);
  assert.match(result.stderr, /claudegrid -- --continue/);
  assert.match(cli(["--layuot", "2x2"]).stderr, /did you mean "--layout"/);
});

test("misspelled commands get a suggestion", () => {
  const result = cli(["doctr"], { cwd: sandbox() });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /did you mean "doctor"/);
});

test("init writes a config that the launcher accepts", { skip: !has("tmux") && "tmux missing" }, () => {
  const repo = gitRepo();
  assert.equal(cli(["init"], { cwd: repo }).code, 0);
  assert.equal(cli(["init"], { cwd: repo }).code, 1);
  assert.deepEqual(cli(["presets", "--names"], { cwd: repo }).stdout.trim().split("\n"), ["duo", "swarm"]);
  const plan = JSON.parse(cli(["--json", "-b", "tmux"], { cwd: repo }).stdout);
  assert.deepEqual(plan.panes.map((p) => p.name), ["main", "tests", "review", "docs"]);
  const swarm = JSON.parse(cli(["swarm", "--json", "-b", "tmux"], { cwd: repo }).stdout);
  assert.equal(swarm.panes.length, 6);
  assert.ok(swarm.panes.every((p) => p.worktree.branch.startsWith("claudegrid/swarm/")));
});

test("--dry-run prints the commands without running them", { skip: !has("tmux") && "tmux missing" }, () => {
  const dir = sandbox();
  writeConfig(dir, { panes: ["first", "second", "third"] });
  const result = cli(["--dry-run", "-b", "tmux", "-t", "demo"], { cwd: dir });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /dry run, these commands would run/);
  assert.equal(result.stdout.match(/tmux split-window/g).length, 2);
  assert.match(result.stdout, /claude first/);
});

test("broken config files stop the launch with the file name", () => {
  const dir = sandbox();
  writeConfig(dir, { panes: [{ promt: "x" }] });
  const result = cli(["--dry-run"], { cwd: dir });
  assert.equal(result.code, 1);
  assert.match(result.stderr, new RegExp(`${join(dir, ".claudegrid.json").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: panes\\[0\\] has an unknown key "promt"`));
  assert.match(result.stderr, /did you mean "prompt"/);
});

test("completion scripts mention every command", () => {
  for (const shell of ["bash", "zsh", "fish"]) {
    const out = cli(["completion", shell]).stdout;
    for (const word of ["init", "doctor", "worktrees", "layout"]) assert.ok(out.includes(word), `${shell}: ${word}`);
  }
  assert.equal(cli(["completion", "powershell"]).code, 1);
});

test("doctor runs and reports node", () => {
  const result = cli(["doctor"], { cwd: sandbox() });
  assert.match(result.stdout, /node\s+v\d+/);
});

test("desktop entry quotes paths for the Exec key", async () => {
  const { desktopEntry } = await import("../dist/commands/desktop.js");
  const entry = desktopEntry(["/usr/bin/node", "/home/a b/cli.js"]);
  assert.match(entry, /^Exec="\/usr\/bin\/node" "\/home\/a b\/cli.js" "ui"$/m);
  assert.match(entry, /^Icon=claudegrid$/m);
});
