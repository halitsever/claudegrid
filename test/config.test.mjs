import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { loadConfigs, mergeGrids, presetNames, resolveLayers, validateConfig } from "../dist/config.js";
import { sandbox, writeConfig } from "./helpers.mjs";

test("pane strings are prompt shorthand", () => {
  const config = validateConfig("x.json", { panes: ["fix lint", { name: "docs" }] });
  assert.deepEqual(config.panes, [{ prompt: "fix lint" }, { name: "docs" }]);
});

test("typos get a suggestion", () => {
  assert.throws(() => validateConfig("x.json", { worktree: true }), (error) => {
    assert.match(error.message, /unknown key "worktree"/);
    assert.match(error.hint, /did you mean "worktrees"/);
    return true;
  });
  assert.throws(() => validateConfig("x.json", { panes: [{ promt: "x" }] }), /panes\[0\] has an unknown key "promt"/);
  assert.throws(() => validateConfig("x.json", { backend: "tmuxx" }), (error) => /did you mean "tmux"/.test(error.hint));
});

test("wrong types are reported with their path", () => {
  assert.throws(() => validateConfig("x.json", { args: "--continue" }), /args must be an array of strings/);
  assert.throws(() => validateConfig("x.json", { panes: 0 }), /panes must be a positive whole number/);
  assert.throws(() => validateConfig("x.json", { presets: { review: { keepShell: "yes" } } }), /presets.review.keepShell must be true or false/);
  assert.throws(() => validateConfig("x.json", { presets: { "bad name": {} } }), /not a valid preset name/);
});

test("later layers win and args add up", () => {
  const merged = mergeGrids({ model: "sonnet", args: ["--a"] }, { model: "opus", args: ["--b"] }, { layout: undefined });
  assert.deepEqual(merged, { model: "opus", args: ["--a", "--b"] });
});

test("presets come from project and user config, project first", () => {
  const dir = sandbox();
  writeConfig(dir, { model: "sonnet", presets: { review: { description: "r", model: "opus", panes: ["a", { name: "b", dir: "sub" }] } } });
  const sources = loadConfigs(dir);
  assert.deepEqual(presetNames(sources), ["review"]);
  const merged = mergeGrids(...resolveLayers(sources, "review"));
  assert.equal(merged.model, "opus");
  assert.equal(merged.description, undefined);
  assert.equal(merged.panes[1].dir, join(dir, "sub"));
  assert.throws(() => resolveLayers(sources, "reveiw"), (error) => /did you mean "review"/.test(error.hint));
});
