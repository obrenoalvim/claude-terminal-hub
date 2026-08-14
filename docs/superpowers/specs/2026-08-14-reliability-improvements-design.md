# Reliability Improvements — Design

> Created: 2026-08-14

## Goal

Four small, independent fixes proposed after the UX pass, approved by the
user in conversation (no open questions — each item was already scoped with
a clear approach).

## Items

1. **No duplicate session panes** — `Sidebar.jsx` lets a user open the same
   Claude session in a second pane. Track open sessions by `cwd`/`command`
   in `App.jsx`; clicking a session already open focuses its existing pane
   instead of spawning a new one.

2. **Confirm before closing an active pane** — `TerminalPane.jsx` already
   tracks pty activity for the status dot (added in the prior UX pass) but
   discards it as a DOM class toggle. Promote it to React state. On close,
   if the pane was active in the last decay window, show an inline confirm
   bar (same visual pattern as the search bar) instead of killing the pty
   immediately.

3. **File logging via electron-log** — add the `electron-log` dependency.
   `electron-log/main` in the main process (auto-initializes file transport),
   `electron-log/renderer` in the renderer entry (auto-forwards to main over
   IPC — no manual bridging needed). While wiring this, fix a related gap
   found in `pty-manager.js`: `pty.spawn` isn't wrapped in try/catch, so an
   unavailable shell (e.g. WSL not installed) throws uncaught in the main
   process instead of failing the pane gracefully. Wrap it, log the error,
   and surface it in the pane as text output before marking it exited.

4. **`author` field in package.json** — electron-builder warns it's missing.
   Set it to `Breno Alvim <brenoalvim.dev@gmail.com>`.

## Testing

Manual smoke per item (no test harness in this repo, consistent with the
prior UX-improvements spec).
