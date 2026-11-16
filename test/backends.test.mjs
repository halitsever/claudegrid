import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProfile, konsoleSequence, parseHierarchy } from "../dist/backends/konsole.js";
import { kittySession } from "../dist/backends/kitty.js";
import { parseTmuxVersion, tmuxSessionName } from "../dist/backends/tmux.js";
import { pickBackend } from "../dist/backends/index.js";
import { itermScript } from "../dist/backends/iterm2.js";
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

test("iTerm2 gets one AppleScript that splits columns first, then rows", () => {
  const plan = buildPlan({ cwd: sandbox(), grid: { layout: "2x2", panes: [{ name: 'say "hi"' }, {}, {}, {}] }, name: "demo" });
  const commands = plan.panes.map((p) => `/tmp/pane-${p.index}.sh`);
  const script = itermScript(plan, commands, { newTab: false });
  assert.match(script, /^tell application "iTerm"/);
  assert.match(script, /set grid to \(create window with default profile command "\/tmp\/pane-0.sh"\)/);
  assert.match(script, /tell s0 to set name to "say \\"hi\\""/);
  assert.match(script, /tell s0 to set s1 to \(split vertically with default profile command "\/tmp\/pane-1.sh"\)/);
  assert.match(script, /tell s0 to set s2 to \(split horizontally with default profile command "\/tmp\/pane-2.sh"\)/);
  assert.match(script, /tell s1 to set s3 to \(split horizontally with default profile command "\/tmp\/pane-3.sh"\)/);
  assert.match(itermScript(plan, commands, { newTab: true }), /tell current window to set grid to \(create tab/);
});

test("a dry run can preview a terminal that is not installed", () => {
  assert.equal(pickBackend("iterm2", process.env, true).name, "iterm2");
});

test("asking for an unusable backend says why", () => {
  assert.throws(() => pickBackend("wezterm", { PATH: "/nonexistent" }), /WezTerm backend is not usable/);
});

test("Terminal.app tiles one window per pane over the screen", async () => {
  const { terminalScript } = await import("../dist/backends/terminal.js");
  const plan = buildPlan({ cwd: sandbox(), grid: { layout: "2x2", panes: [{ name: 'say "hi"' }, {}, {}, {}] }, name: "demo" });
  const commands = plan.panes.map((p) => `exec /tmp/pane-${p.index}.sh`);
  const script = terminalScript(plan, commands, { left: 0, top: 25, width: 1000, height: 800 });
  assert.match(script, /^tell application "Terminal"/);
  assert.match(script, /set t0 to do script "exec \/tmp\/pane-0.sh"/);
  assert.match(script, /set custom title of t0 to "say \\"hi\\""/);
  assert.match(script, /set bounds of front window to \{0, 25, 500, 425\}/);
  assert.match(script, /set bounds of front window to \{500, 425, 1000, 825\}/);
});

test("--trust marks every pane folder as accepted and keeps the rest of the file", async () => {
  const { trustFolders } = await import("../dist/trust.js");
  const { readFileSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const dir = sandbox();
  const file = join(dir, "claude.json");
  writeFileSync(file, JSON.stringify({ theme: "dark", projects: { [dir]: { allowedTools: ["Bash"] } } }));
  assert.ok(trustFolders([dir], file).includes(dir));
  const state = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(state.theme, "dark");
  assert.deepEqual(state.projects[dir], { allowedTools: ["Bash"], hasTrustDialogAccepted: true });
  assert.deepEqual(trustFolders([dir], file), []);
});
