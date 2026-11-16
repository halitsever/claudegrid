import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProfile, konsoleSequence, parseHierarchy } from "../dist/backends/konsole.js";
import { kittySession } from "../dist/backends/kitty.js";
import { parseTmuxVersion, tmuxSessionName } from "../dist/backends/tmux.js";
import { pickBackend } from "../dist/backends/index.js";
import { konsolePaneIndex } from "../dist/pane.js";
import { buildPlan } from "../dist/plan.js";
import { sandbox } from "./helpers.mjs";

test("konsole builds columns first, then rows, and maps sessions back to panes", () => {
  const { splits, order } = konsoleSequence({ columns: [2, 2, 2] });
  assert.deepEqual(splits, [
    { from: 0, horizontal: true },
    { from: 1, horizontal: true },
    { from: 0, horizontal: false },
    { from: 1, horizontal: false },
    { from: 2, horizontal: false },
  ]);
  assert.deepEqual(order, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(konsoleSequence({ columns: [3, 1] }).order, [0, 1, 2, 3]);
  assert.deepEqual(konsoleSequence({ columns: [1, 3] }).order, [0, 1, 2, 3]);
  assert.deepEqual(konsoleSequence({ columns: [3, 3] }).order, [0, 1, 2, 4, 3, 5]);
});

test("konsole view hierarchy parses into views and splitters", () => {
  const { views, splitters } = parseHierarchy("(0)[(1){0|3|6}|(2){1|4}|(3){2|5}]");
  assert.deepEqual(views, [0, 3, 6, 1, 4, 2, 5]);
  assert.deepEqual(splitters, [
    { id: 0, children: 3 },
    { id: 1, children: 3 },
    { id: 2, children: 2 },
    { id: 3, children: 2 },
  ]);
  assert.deepEqual(parseHierarchy("(0)[0]"), { views: [0], splitters: [{ id: 0, children: 1 }] });
});

test("the konsole profile keeps the user's settings but runs claudegrid", () => {
  const base = "[Appearance]\nColorScheme=Breeze\n\n[General]\nName=Mine\nCommand=/bin/zsh\nParent=FALLBACK/\nTerminalColumns=120\n";
  const profile = buildProfile("/run/x.sh", base);
  assert.match(profile, /ColorScheme=Breeze/);
  assert.match(profile, /\[General\]\nName=claudegrid\nCommand=\/run\/x.sh\nTerminalColumns=120/);
  assert.doesNotMatch(profile, /Name=Mine|zsh|Parent=/);
  assert.equal(buildProfile("/x"), "[General]\nName=claudegrid\nCommand=/x\n");
});

test("tab profiles carry their own name and tab title", () => {
  const profile = buildProfile("/run/tab.sh", "[General]\nLocalTabTitleFormat=%d : %n\n", { name: "claudegrid", tabTitle: "▦ claudegrid" });
  assert.match(profile, /LocalTabTitleFormat=▦ claudegrid\nRemoteTabTitleFormat=▦ claudegrid/);
  assert.doesNotMatch(profile, /%d : %n/);
});

test("konsole tab tickets are keyed by bus name and session", async () => {
  const { konsoleTabTicketPath } = await import("../dist/spec.js");
  assert.match(konsoleTabTicketPath(":1.42", "7"), /konsole-tab-_1\.42-7\.json$/);
});

test("konsole panes find their index from KONSOLE_DBUS_SESSION", () => {
  const spec = { order: [0, 1, 2, 4, 3, 5] };
  assert.equal(konsolePaneIndex(spec, { KONSOLE_DBUS_SESSION: "/Sessions/1" }), 0);
  assert.equal(konsolePaneIndex(spec, { KONSOLE_DBUS_SESSION: "/Sessions/4" }), 4);
  assert.equal(konsolePaneIndex({}, { KONSOLE_DBUS_SESSION: "/Sessions/3" }), 2);
  assert.equal(konsolePaneIndex(spec, {}), undefined);
});

test("kitty gets a session file with one quoted launch line per pane", () => {
  const plan = buildPlan({ cwd: sandbox(), grid: { panes: [{ name: "it's" }, {}] }, name: "demo" });
  const session = kittySession(plan, (i) => ["claudegrid", "pane", "--index", String(i)]);
  const lines = session.trimEnd().split("\n");
  assert.equal(lines[0], "new_tab demo");
  assert.equal(lines[1], "layout grid");
  assert.match(lines[2], /^launch --title 'it'\\''s' --cwd \S+ claudegrid pane --index 0$/);
  assert.equal(lines.length, 4);
});

test("tmux names and versions", () => {
  assert.equal(tmuxSessionName("my.repo:x"), "claudegrid-my-repo-x");
  assert.equal(tmuxSessionName("..."), "claudegrid-grid");
  assert.deepEqual(parseTmuxVersion("tmux 3.6a"), [3, 6]);
  assert.deepEqual(parseTmuxVersion("tmux next-3.7"), [3, 7]);
  assert.equal(parseTmuxVersion("tmux master"), undefined);
});

test("asking for an unusable backend says why", () => {
  assert.throws(() => pickBackend("wezterm", { PATH: "/nonexistent" }), /WezTerm backend is not usable/);
});
