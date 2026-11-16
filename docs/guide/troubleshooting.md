---
title: Troubleshooting
description: Fix common claudegrid problems such as a missing qdbus6, an unsplit Konsole window or a claude command not found error.
---

# Troubleshooting

## `missing dependency: qdbus6`

Install the Qt 6 D-Bus tool. The package name depends on the distro, for example `qt6-tools` on Arch or `qdbus-qt6` on Fedora.

## The window opens but does not split

The D-Bus service did not register within 5 seconds. Run `claudegrid` again. If it keeps happening, check that `qdbus6 org.kde.konsole-<pid>` lists the window while it is open.

## `claude: command not found` inside a pane

The pane shell does not see `claude` on its `PATH`. Make sure the directory holding `claude` is exported in your shell config, not only in an interactive alias.

## Something else

[Open an issue](https://github.com/halitsever/claudegrid/issues) with your distro, Konsole version and the output you see.
