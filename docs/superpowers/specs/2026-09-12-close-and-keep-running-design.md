# Close and keep running

## Problem

Closing a pane always kills its PTY. User wants to "minimize" a pane instead:
hide it from the grid to free screen space, but keep the shell/Claude session
alive in the background. Clicking the same session again in the sidebar should
just reveal it — not respawn (no re-running `claude --resume`).

## Design

**Pane state**: add `hidden` boolean to each pane object in `App.jsx`'s
`panes` state (and persist it in `localStorage` alongside the existing
fields). A hidden pane stays mounted (PTY + xterm instance untouched) but is
rendered outside the visible grid.

**Close dialog** (`TerminalPane.jsx`): always shown on X click (previously
only shown if the pane had recent activity). Three actions:
- Cancel
- **Fechar e continuar executando** → sets `hidden: true` on the pane
- Fechar → existing behavior (removes pane from array → unmounts →
  `killPty`)

**Rendering** (`PaneGrid.jsx`): split `panes` into visible/hidden. The
`.pane-grid` div renders only visible panes (`layout-${visible.length}`,
unchanged CSS). Hidden panes render inside a sibling `<div class="pane-
background">` (`display:none`) so they don't interfere with the CSS grid's
`:first-child` layout rule.

**Fit while hidden** (`TerminalPane.jsx`): skip `fit.fit()` calls while
`hidden` is true (avoids resizing the terminal to 0x0 while offscreen);
refit once when transitioning hidden → visible.

**Reopening** (`App.jsx openSession`): if the session's pane already exists
and is hidden, unhide it and focus it (no new PTY spawned — `startPty` in
main is already a no-op if the paneId's PTY is still alive). If no visible
slot is free (4 already visible), no-op silently, matching the existing
disabled-button behavior for the same case.

**Pane limit**: `MAX_PANES` (4) now counts only non-hidden panes wherever
it's checked (`openPane`, `openSession`, `canOpen` passed to Sidebar/
PaneGrid). Background sessions no longer block opening a new visible pane.

**Session deletion**: unchanged — deleting a session still filters it out of
`panes` entirely (hidden or not), which unmounts and kills its PTY.

## Out of scope

- Surviving a full app restart with the PTY still attached — not possible,
  the PTY is a child process of the Electron main process. On restart every
  persisted pane (visible or hidden) respawns via its `command` as it does
  today; a previously-hidden one simply restarts hidden.
- Any cap on how many hidden/background sessions can accumulate.
