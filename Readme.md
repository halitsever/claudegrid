<p align="center" class="logo-section">
<img src="docs/public/logo.svg" height="96" width="96" alt="claudegrid logo"/>
<br/>
<img src="https://halitsever-api.vercel.app/api/repo-title?title=claudegrid">

<p align="center">
Open a Konsole window split 2x2 with Claude Code running in every pane.<br>
<br/>
<br/>
<img src="https://img.shields.io/github/sponsors/halitsever"/>
</p>
<p align="center">
<a align="center" href="https://halitsever.github.io/claudegrid/">Documentation</a>
  </p>
</p>

<p align="center">
<img src="https://halitsever-api.vercel.app/api/details"/>
</p>

- 🪟 **One command, four sessions** - `claudegrid` opens a new Konsole window with four `claude` panes
- 📁 **Same directory** - every pane starts in the directory you ran it from
- 🎛️ **Shared flags** - extra arguments go to each `claude`, e.g. `claudegrid --model opus`
- 🐚 **Shell stays open** - when `claude` exits, the pane drops into your shell

<p align="center" >
<img src="https://halitsever-api.vercel.app/api/installation"/>
</p>

Requires KDE Konsole, `qdbus6` and [Claude Code](https://claude.com/claude-code).

```sh
git clone https://github.com/halitsever/claudegrid.git
cd claudegrid
./install.sh
```

The installer copies `claudegrid` to `~/.local/bin` (override with `BIN_DIR`) and creates a `claudegrid` Konsole profile.

<h3 id="usage">Usage</h3>

```sh
cd ~/my-project
claudegrid                    # four plain claude sessions
claudegrid --continue         # every pane gets the same flags
```

<p align="center">
<a href="https://github.com/halitsever/claudegrid/issues"><img src="https://halitsever-api.vercel.app/api/issue"/></a>
</p>

<p align="center">
Found a bug or have an idea? Open an <a href="https://github.com/halitsever/claudegrid/issues">issue</a>.<br/>
Read the <a href=".github/CONTRIBUTING.md">contributing guide</a> before sending a pull request.
</p>

<p align="center">
<img src="https://halitsever-api.vercel.app/api/sponsor"/>
</p>

<p align="center">
<img src="https://halitsever-api.vercel.app/api/license"/>
</p>

<p align="center">
Released under the <a href="LICENSE">MIT License</a>.
</p>
