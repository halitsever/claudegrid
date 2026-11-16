<script setup lang="ts">
import { computed, ref } from "vue";
import { withBase } from "vitepress";

const install = "npm install -g @halitsever/claudegrid";
const copied = ref(false);
async function copyInstall() {
  try {
    await navigator.clipboard.writeText(install);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    copied.value = false;
  }
}

const heroPanes = [
  { name: "main", ask: "add a /health endpoint", lines: [["dim", "● Reading src/server.ts"], ["dim", "● Editing src/routes/health.ts  +18"], ["ok", "✔ endpoint added, 2 files changed"]] },
  { name: "tests", ask: "fix the failing tests", lines: [["dim", "● Running npm test"], ["bad", "✖ 2 failing in auth.test.ts"], ["ok", "✔ 48 passing"]] },
  { name: "review", ask: "review the uncommitted changes", lines: [["dim", "● Reading git diff, 4 files"], ["warn", "! token expiry is never checked"], ["ok", "✔ notes in REVIEW.md"]] },
  { name: "docs", ask: "check the README against the code", lines: [["dim", "● Reading README.md"], ["dim", "● Editing README.md  +9 -6"], ["ok", "✔ docs match the code"]] },
];

/** Same rule as the CLI: COLSxROWS, or a count laid out as close to square as possible. */
function columnsFor(spec: string): number[] {
  const m = /^(\d+)x(\d+)$/.exec(spec);
  if (m) return Array(Number(m[1])).fill(Number(m[2]));
  const n = Number(spec);
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const columns = Array(cols).fill(rows);
  for (let extra = cols * rows - n, i = cols - 1; extra > 0; extra--, i--) columns[i]--;
  return columns;
}

const layouts = [
  { spec: "2x1", label: "2x1" },
  { spec: "2x2", label: "2x2" },
  { spec: "1x3", label: "1x3" },
  { spec: "3x2", label: "3x2" },
  { spec: "5", label: "-n 5" },
  { spec: "4x4", label: "4x4" },
];
const picked = ref("2x2");
const columns = computed(() => columnsFor(picked.value));
const total = computed(() => columns.value.reduce((a, b) => a + b, 0));
const command = computed(() => (/x/.test(picked.value) ? `claudegrid -l ${picked.value}` : `claudegrid -n ${picked.value}`));
/** Pane numbers follow reading order: across the top row first, then the next row. */
function paneNumber(col: number, row: number): number {
  let n = 0;
  for (let r = 0; r < row; r++) n += columns.value.filter((h) => h > r).length;
  return n + columns.value.slice(0, col).filter((h) => h > row).length + 1;
}

const terminals = [
  { name: "Konsole", note: "a new tab, D-Bus splits" },
  { name: "iTerm2", note: "macOS, AppleScript" },
  { name: "tmux", note: "any terminal, over SSH" },
  { name: "kitty", note: "session file" },
  { name: "WezTerm", note: "wezterm cli" },
  { name: "Terminal.app", note: "macOS, tiled windows" },
];
</script>

<template>
  <div class="cg">
    <!-- Hero -->
    <section class="hero wrap">
      <div class="hero-copy">
        <p class="eyebrow"><span class="dot" />Claude Code, times four</p>
        <h1>Run a grid of Claude Code agents.<br /><span class="grad">One command.</span></h1>
        <p class="lede">claudegrid opens 2 to 16 Claude Code sessions side by side in Konsole, iTerm2, tmux, kitty or WezTerm, on Linux and macOS, and gives each pane its own task, model and git branch.</p>
        <div class="install">
          <code><span class="prompt">$</span> {{ install }}</code>
          <button type="button" class="copy" :aria-label="copied ? 'Copied' : 'Copy install command'" @click="copyInstall">{{ copied ? "Copied" : "Copy" }}</button>
        </div>
        <div class="ctas">
          <a class="btn primary" :href="withBase('/guide/getting-started')">Get started</a>
          <a class="btn ghost" href="https://github.com/halitsever/claudegrid">Star on GitHub</a>
        </div>
      </div>

      <div class="window" aria-label="A claudegrid window with four Claude Code panes">
        <div class="titlebar"><i /><i /><i /><span>claudegrid · my-app · 2x2</span></div>
        <div class="panes">
          <div v-for="(p, i) in heroPanes" :key="p.name" class="pane" :class="{ active: i === 0 }" :style="{ '--d': i * 0.12 + 's' }">
            <div class="pane-head"><span class="brand">▦ claudegrid</span> <span class="muted">{{ i + 1 }}/4</span> <b>{{ p.name }}</b></div>
            <div class="ask"><span class="gt">&gt;</span> {{ p.ask }}</div>
            <div v-for="(l, j) in p.lines" :key="j" class="out" :class="l[0]" :style="{ '--d': 0.5 + i * 0.15 + j * 0.45 + 's' }">{{ l[1] }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Terminals -->
    <section class="strip wrap" aria-label="Supported terminals">
      <span class="strip-label">Works in</span>
      <ul>
        <li v-for="t in terminals" :key="t.name"><b>{{ t.name }}</b><span>{{ t.note }}</span></li>
      </ul>
    </section>

    <!-- Layouts -->
    <section class="feature wrap reveal">
      <div class="feature-copy">
        <p class="kicker">Layouts</p>
        <h2>Any grid, evenly sized</h2>
        <p>Columns by rows, or just a number of panes. Every split is sized so the panes come out equal, in every terminal. Pane 1 is top left and the rest follow in reading order.</p>
        <div class="chips" role="radiogroup" aria-label="Layout">
          <button v-for="l in layouts" :key="l.spec" type="button" role="radio" :aria-checked="picked === l.spec" :class="{ on: picked === l.spec }" @click="picked = l.spec">{{ l.label }}</button>
        </div>
        <pre class="cmd"><span class="prompt">$</span> {{ command }}</pre>
      </div>
      <div class="grid-demo" :aria-label="`${total} panes`">
        <div v-for="(rows, c) in columns" :key="picked + c" class="col">
          <div v-for="r in rows" :key="r" class="cell" :class="{ lead: c === 0 && r === 1 }">
            <span>{{ paneNumber(c, r - 1) }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Tasks -->
    <section class="feature wrap flip reveal">
      <div class="feature-copy">
        <p class="kicker">A task per pane</p>
        <h2>Hand out the work in one line</h2>
        <p>Every <code>-p</code> gives the next pane its first prompt. Pick a model for all of them, or set one per pane in a config file. Anything after <code>--</code> goes to every <code>claude</code>.</p>
        <a class="more" :href="withBase('/guide/usage')">Usage guide →</a>
      </div>
      <div class="term">
        <pre><span class="prompt">$</span> claudegrid <span class="flag">-m</span> opus \
    <span class="flag">-p</span> <span class="str">"add a /health endpoint"</span> \
    <span class="flag">-p</span> <span class="str">"fix the failing tests"</span> \
    <span class="flag">-p</span> <span class="str">"review the diff"</span>

<span class="brand">▦ claudegrid</span> my-app <span class="muted">· 2x2 · KDE Konsole</span>
   <span class="muted">1</span> pane-1  ~/my-app
     <span class="muted">claude --model opus 'add a /health endpoint'</span>
   <span class="muted">2</span> pane-2  ~/my-app
     <span class="muted">claude --model opus 'fix the failing tests'</span>
   <span class="muted">3</span> pane-3  ~/my-app
     <span class="muted">claude --model opus 'review the diff'</span>
   <span class="muted">4</span> pane-4  ~/my-app
     <span class="muted">claude --model opus</span>
<span class="ok">✔ opened a Konsole window</span></pre>
      </div>
    </section>

    <!-- Worktrees -->
    <section class="feature wrap reveal">
      <div class="feature-copy">
        <p class="kicker">Git worktrees</p>
        <h2>Every agent on its own branch</h2>
        <p>Four agents in one checkout overwrite each other. With <code>-w</code> each pane gets its own worktree and branch next to your repo. Open the grid again and every agent picks up where it stopped.</p>
        <a class="more" :href="withBase('/guide/worktrees')">Worktrees guide →</a>
      </div>
      <div class="term">
        <pre><span class="prompt">$</span> claudegrid <span class="flag">-w -n</span> 3
<span class="muted">created worktree</span> ~/code/app.claudegrid/grid-pane-1 <span class="cyan">(claudegrid/grid/pane-1)</span>
<span class="muted">created worktree</span> ~/code/app.claudegrid/grid-pane-2 <span class="cyan">(claudegrid/grid/pane-2)</span>
<span class="muted">created worktree</span> ~/code/app.claudegrid/grid-pane-3 <span class="cyan">(claudegrid/grid/pane-3)</span>

<span class="prompt">$</span> claudegrid worktrees
claudegrid/grid/pane-1  <span class="ok">clean</span>, <span class="cyan">3 commits ahead</span>
claudegrid/grid/pane-2  <span class="warn">2 changed</span>
claudegrid/grid/pane-3  <span class="ok">clean</span>

<span class="prompt">$</span> claudegrid worktrees clean
<span class="warn">warning</span>: skipping claudegrid/grid/pane-2: 2 uncommitted changes</pre>
      </div>
    </section>

    <!-- Presets -->
    <section class="feature wrap flip reveal">
      <div class="feature-copy">
        <p class="kicker">Presets</p>
        <h2>Save your team, start it by name</h2>
        <p>Put pane names, prompts, models and directories in <code>.claudegrid.json</code>. Presets are named variations you start with one word. The JSON Schema gives you autocomplete in your editor.</p>
        <a class="more" :href="withBase('/guide/presets')">Presets guide →</a>
      </div>
      <div class="term">
        <pre><span class="muted">// .claudegrid.json</span>
{
  <span class="key">"presets"</span>: {
    <span class="key">"review"</span>: {
      <span class="key">"model"</span>: <span class="str">"opus"</span>,
      <span class="key">"panes"</span>: [
        { <span class="key">"name"</span>: <span class="str">"bugs"</span>, <span class="key">"prompt"</span>: <span class="str">"Review the diff for bugs"</span> },
        { <span class="key">"name"</span>: <span class="str">"security"</span>, <span class="key">"prompt"</span>: <span class="str">"Look for security problems"</span> },
        { <span class="key">"name"</span>: <span class="str">"tests"</span>, <span class="key">"prompt"</span>: <span class="str">"List changes without a test"</span> }
      ]
    }
  }
}

<span class="prompt">$</span> claudegrid review</pre>
      </div>
    </section>

    <!-- App -->
    <section class="app-band wrap reveal">
      <div class="app-copy">
        <p class="kicker">Desktop app</p>
        <h2>Prefer clicking? There is an app</h2>
        <p>Run <code>claudegrid ui</code> or add it to your app menu with <code>claudegrid desktop install</code>. Pick a project, click a pane to give it a task, preview the commands and launch. Everything stays on your machine.</p>
        <a class="more" :href="withBase('/guide/app')">Desktop app guide →</a>
      </div>
      <div class="app-shot">
        <img class="light-only" :src="withBase('/ui-light.png')" alt="The claudegrid app with a 2x2 grid of panes and a pane editor" width="1400" height="860" loading="lazy" />
        <img class="dark-only" :src="withBase('/ui-dark.png')" alt="The claudegrid app in dark mode" width="1400" height="860" loading="lazy" />
      </div>
    </section>

    <!-- Safety -->
    <section class="safety wrap reveal">
      <p class="kicker center">Safe to try</p>
      <h2 class="center">See everything before it runs</h2>
      <div class="cards">
        <article>
          <h3><code>--dry-run</code></h3>
          <p>Prints the plan and every tmux, Konsole or WezTerm command claudegrid would run. Nothing opens.</p>
        </article>
        <article>
          <h3><code>doctor</code></h3>
          <p>Checks Node.js, Claude Code, git and each terminal, and tells you which one <code>auto</code> picks.</p>
        </article>
        <article>
          <h3>Did you mean</h3>
          <p>A typo in a flag, preset or config key stops the launch and suggests the right word.</p>
        </article>
      </div>
      <pre class="term small"><span class="red">error</span>: .claudegrid.json: panes[1] has an unknown key "promt"
<span class="muted">hint</span>: did you mean "prompt"?</pre>
    </section>

    <!-- Final CTA -->
    <section class="final wrap reveal">
      <img :src="withBase('/logo.svg')" alt="" width="72" height="72" />
      <h2>Open your first grid</h2>
      <div class="install center">
        <code><span class="prompt">$</span> {{ install }}</code>
        <button type="button" class="copy" @click="copyInstall">{{ copied ? "Copied" : "Copy" }}</button>
      </div>
      <p class="muted-text">Node.js 20+, Claude Code and one of the four terminals. Then run <code>claudegrid</code> in any project.</p>
      <div class="ctas center">
        <a class="btn primary" :href="withBase('/guide/getting-started')">Read the docs</a>
        <a class="btn ghost" :href="withBase('/guide/cli')">CLI reference</a>
      </div>
    </section>
  </div>
</template>
