# UX Improvements — Design

> Created: 2026-08-14

## Goal

Nine independent UX improvements to Claude Terminal Hub, an Electron app that
lists/resumes Claude Code sessions and general shells in up to 4 xterm.js/node-pty
panes. Scope narrowed via brainstorming: two ambiguous items were resolved with
the user (shell picker instead of generic "profiles"; simple activity indicator
instead of OSC133 shell-integration). "Split pane" was dropped — already exists
(`PaneGrid.jsx`, grid up to 4 panes).

## Items

1. **Periodic update check** — `main/index.js` already wires `electron-updater`
   with a boot-time check. Add `setInterval(() => autoUpdater.checkForUpdates(), 4h)`
   so long-running sessions still pick up updates.

2. **Restore panes on relaunch** — `App.jsx` persists `panes` (title/cwd/command,
   not `paneId`) to `localStorage` on every change; rehydrates on mount. Resuming
   a Claude session re-issues `claude --resume <id>`, which the CLI already
   supports idempotently.

3. **Fixed keyboard shortcuts** — not user-remappable (no request for that, skip
   per YAGNI). Window-scoped `keydown` listener in `App.jsx`:
   Ctrl+T new terminal, Ctrl+W close focused pane, Ctrl+Tab cycle focus, Ctrl+F
   search, Ctrl+Plus/Minus/0 zoom.

4. **Light/dark theme** — toggle in `SettingsPanel`, persisted as
   `settings.theme` in `localStorage`. `data-theme` attribute on root selects an
   alternate CSS variable block in `styles.css`. `TerminalPane` updates
   `term.options.theme` when the setting changes.

5. **In-terminal search** — add `@xterm/addon-search` dependency (not yet
   installed). Ctrl+F opens an inline search bar on the focused pane; next/prev
   via the addon's API.

6. ~~Split pane~~ — out of scope, already implemented.

7. **Activity indicator** — extend the existing `pane-dot` (already shows
   "dead" on pty exit). Add an `active` class with a CSS pulse when pty data
   arrives; remove it after ~1.5s of silence. Approximate by design — no shell
   integration.

8. **Shell picker for "Novo terminal"** — dropdown: PowerShell / cmd / Git Bash
   / WSL. `startPty` / `pty-manager.js` accept an explicit `shell` instead of
   hardcoding by platform; falls back to the platform default if the chosen
   shell binary isn't found (same pattern as the existing `resolvedCwd` fallback).

9. **Notification on command finish** — Electron `Notification` API fires when
   a pty exits while the window is unfocused, or on a BEL (`\x07`) byte in pty
   output — the standard terminal "needs attention" signal. No "long-running"
   duration heuristic (unreliable, skipped per YAGNI).

10. **Global font zoom** — Ctrl+Plus/Minus/0 adjusts `fontSize` across all
    panes, persisted in `localStorage`.

## Testing

No existing test suite in this repo. Each item gets a manual smoke check
during implementation (documented in the log, not automated) since these are
UI/Electron-runtime behaviors without a test harness to hook into.
