import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { test } from "node:test";
import { buildPlan } from "../dist/plan.js";
import { gitRepo, sandbox } from "./helpers.mjs";

test("defaults to four claude panes in the current directory", () => {
  const cwd = sandbox();
  const plan = buildPlan({ cwd, grid: {} });
  assert.equal(plan.panes.length, 4);
  assert.deepEqual(plan.panes.map((p) => p.argv), Array(4).fill(["claude"]));
  assert.ok(plan.panes.every((p) => p.cwd === cwd));
  assert.equal(plan.keepShell, true);
  assert.equal(plan.newTab, true);
  assert.equal(buildPlan({ cwd, grid: { newTab: false } }).newTab, false);
});

test("claude arguments are assembled in a fixed order", () => {
  const grid = { args: ["--verbose"], model: "sonnet", panes: [{ name: "a", model: "opus", args: ["--x"], prompt: "from config" }, { name: "b" }] };
  const plan = buildPlan({ cwd: sandbox(), grid, extraArgs: ["--continue"] });
  assert.deepEqual(plan.panes[0].argv, ["claude", "--verbose", "--model", "opus", "--x", "--continue", "from config"]);
  assert.deepEqual(plan.panes[1].argv, ["claude", "--verbose", "--model", "sonnet", "--continue"]);
});

test("a command line prompt replaces only the prompt of its pane", () => {
  const grid = { panes: [{ name: "a", model: "opus", prompt: "from config" }] };
  const plan = buildPlan({ cwd: sandbox(), grid, prompts: ["from cli"] });
  assert.deepEqual(plan.panes[0].argv, ["claude", "--model", "opus", "from cli"]);
  assert.equal(plan.panes[0].name, "a");
});

test("command line prompts fill panes in order and grow the grid", () => {
  const plan = buildPlan({ cwd: sandbox(), grid: {}, prompts: ["one", "two", "three", "four", "five"] });
  assert.equal(plan.panes.length, 5);
  assert.equal(plan.panes[4].argv.at(-1), "five");
});

test("mistakes in pane setup are caught before anything opens", () => {
  const cwd = sandbox();
  assert.throws(() => buildPlan({ cwd, grid: { layout: "2x1", panes: [{}, {}, {}] } }), /3 panes are configured but the layout only has 2 slots/);
  assert.throws(() => buildPlan({ cwd, grid: { panes: [{ name: "x" }, { name: "x" }] } }), /two panes are named "x"/);
  assert.throws(() => buildPlan({ cwd, grid: { panes: [{ dir: "missing" }] } }), /not a directory/);
  assert.throws(() => buildPlan({ cwd, grid: { worktrees: true } }), /worktrees need a git repository/);
});

test("worktrees sit next to the repo, one branch per pane", () => {
  const repo = gitRepo();
  mkdirSync(join(repo, "web"));
  const plan = buildPlan({ cwd: repo, grid: { worktrees: true, panes: [{ name: "Front End", dir: "web" }, {}] }, preset: "review" });
  const [front, second] = plan.panes;
  assert.equal(front.worktree.branch, "claudegrid/review/front-end");
  assert.equal(front.worktree.path, join(dirname(repo), `${basename(repo)}.claudegrid`, "review-front-end"));
  assert.equal(front.cwd, join(front.worktree.path, "web"));
  assert.equal(second.worktree.branch, "claudegrid/review/pane-2");
  assert.equal(plan.name, "review");
});
