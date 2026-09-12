# Close and Keep Running Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Closing a pane can hide it (PTY stays alive) instead of always killing it; reopening the same session from the sidebar reveals the hidden pane instead of respawning it.

**Architecture:** Add a `hidden` boolean to each pane object in `App.jsx` state. Hidden panes stay mounted (so their PTY + xterm buffer survive) but render outside the `.pane-grid` in a `display:none` sibling container. The close confirm dialog gains a third action that sets `hidden: true` instead of removing the pane.

**Tech Stack:** React 19 (renderer), Electron main (`pty-manager.js`, unchanged), `@xterm/xterm` + `@xterm/addon-fit`, plain CSS.

**Spec:** `docs/superpowers/specs/2026-09-12-close-and-keep-running-design.md`

## Global Constraints

- Confirm dialog on pane close always shows (not just when the pane has recent activity).
- Hidden (background) panes do not count against `MAX_PANES` (4) when checking if a new visible pane can be opened.
- No test framework exists in this repo (`package.json` only has `lint`); verification is manual via `npm run dev`.
- No new dependencies.

---

### Task 1: Pane state — `hidden` flag, hide/unhide, pane-limit counting

**Files:**
- Modify: `src/renderer/src/App.jsx`

**Interfaces:**
- Produces: pane objects now carry `hidden: boolean`. New handler `hidePane(paneId)` passed to `PaneGrid` as `onHide`. `openSession` unhides an existing hidden pane instead of no-oping.

- [ ] **Step 1: Add `hidden: false` when creating panes**

In `openPane` (around `App.jsx:103-110`) and the "new pane" branch of `openSession` (around `App.jsx:112-131`), include `hidden: false` in the pane object literal.

- [ ] **Step 2: Count only non-hidden panes against `MAX_PANES`**

Replace every `prev.length >= MAX_PANES` / `panes.length >= MAX_PANES` / `panes.length < MAX_PANES` check in `App.jsx` with a count of non-hidden panes. Add a small helper near the top of the component body:

```js
const visibleCount = (list) => list.filter((p) => !p.hidden).length;
```

Update:
- `openPane`: `if (visibleCount(prev) >= MAX_PANES) return prev;`
- `openSession`'s "create new" branch: same check.
- The `canOpen={panes.length < MAX_PANES}` prop passed to `Sidebar` and `PaneGrid` (two call sites near the bottom `return`): change to `canOpen={visibleCount(panes) < MAX_PANES}`.

- [ ] **Step 3: `openSession` unhides an existing hidden pane instead of ignoring it**

Replace the existing-pane branch of `openSession` (currently just focuses and returns `prev` unchanged):

```js
const openSession = useCallback((session) => {
  setPanes((prev) => {
    const idx = prev.findIndex((p) => p.sessionId === session.id);
    if (idx !== -1) {
      const existing = prev[idx];
      setFocusedId(existing.paneId);
      if (!existing.hidden) return prev;
      if (visibleCount(prev) >= MAX_PANES) return prev;
      const next = [...prev];
      next[idx] = { ...existing, hidden: false };
      return next;
    }
    if (visibleCount(prev) >= MAX_PANES) return prev;
    const paneId = `pane-${++paneSeq.current}`;
    setFocusedId(paneId);
    return [...prev, {
      paneId,
      title: session.project,
      cwd: session.cwd,
      command: `claude --resume ${session.id}${skipPermissions ? ' --dangerously-skip-permissions' : ''}`,
      shell: null,
      sessionId: session.id,
      hidden: false,
    }];
  });
}, [skipPermissions]);
```

- [ ] **Step 4: Add `hidePane` and wire it into `PaneGrid`**

Add next to `closePane` (around `App.jsx:133-135`):

```js
const hidePane = useCallback((paneId) => {
  setPanes((prev) => {
    const next = prev.map((p) => (p.paneId === paneId ? { ...p, hidden: true } : p));
    setFocusedId((prevFocused) => {
      if (prevFocused !== paneId) return prevFocused;
      const remaining = next.filter((p) => !p.hidden);
      return remaining.length ? remaining[remaining.length - 1].paneId : null;
    });
    return next;
  });
}, []);
```

Pass it to `PaneGrid` in the JSX: add `onHide={hidePane}` next to the existing `onClose={closePane}`.

- [ ] **Step 5: Persist `hidden` in localStorage**

In the `toStore` effect (around `App.jsx:82-85`), add `hidden` to the destructured/stored fields:

```js
const toStore = panes.map(({ title, cwd, command, shell, sessionId, hidden }) => ({ title, cwd, command, shell, sessionId, hidden }));
```

`loadStoredPanes` already spreads the stored object (`{ ...p, paneId }`), so `hidden` comes back automatically — no change needed there.

- [ ] **Step 6: Manual verification**

Run `npm run dev`. Open two sessions from the sidebar (or two shells). Confirm both are counted toward the 4-pane cap by opening panes until "new terminal" is disabled at 4 visible panes. This step is re-verified fully after Task 2/3 land (hiding needs the UI from those tasks) — for now just confirm the app still starts and existing open/close/new-pane flows aren't broken.

- [ ] **Step 7: Commit**

Use the `/commit` skill (never plain `git commit` — see project convention). Stage `src/renderer/src/App.jsx` and draft message `feat: add hidden pane state for close-and-keep-running`.

---

### Task 2: Confirm dialog — always show, add "keep running" action

**Files:**
- Modify: `src/renderer/src/components/TerminalPane.jsx`
- Modify: `src/shared/locales/en.js`
- Modify: `src/shared/locales/pt.js`
- Modify: `src/renderer/src/styles.css`

**Interfaces:**
- Consumes: new `onHide` prop on `TerminalPane` (passed from `PaneGrid`, wired in Task 3).
- Produces: no new exports; internal behavior change only.

- [ ] **Step 1: Add i18n keys**

In `src/shared/locales/en.js`, replace line 51 and add a new key right after it:

```js
  'pane.confirmClose': 'Close this pane?',
  'pane.keepRunning': 'Close and keep running',
```

In `src/shared/locales/pt.js`, replace line 51 and add a new key right after it:

```js
  'pane.confirmClose': 'Fechar este painel?',
  'pane.keepRunning': 'Fechar e continuar executando',
```

- [ ] **Step 2: Accept `onHide` prop and always request confirmation**

In `TerminalPane.jsx`, add `onHide` to the component's prop list (`TerminalPane({ pane, focused, onFocus, onClose, onHide, onNewHere, fontSize, theme, t })`).

Replace `requestClose` (`TerminalPane.jsx:133-136`):

```js
const requestClose = () => setConfirmClose(true);
```

- [ ] **Step 3: Add the "keep running" button to the confirm dialog**

Replace the `confirmClose` block (`TerminalPane.jsx:160-168`):

```jsx
{confirmClose && (
  <div className="pane-confirm" onMouseDown={(e) => e.stopPropagation()}>
    <span>{t('pane.confirmClose')}</span>
    <div className="pane-confirm-actions">
      <button className="pane-confirm-cancel" onClick={() => setConfirmClose(false)}>{t('pane.cancel')}</button>
      <button className="pane-confirm-keep" onClick={() => { setConfirmClose(false); onHide(); }}>{t('pane.keepRunning')}</button>
      <button className="pane-confirm-ok" onClick={onClose}>{t('pane.close')}</button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Style the new button**

In `src/renderer/src/styles.css`, after the `.pane-confirm-cancel:hover` rule (around line 580), add:

```css
.pane-confirm-keep { border-color: var(--accent); color: var(--accent); }
.pane-confirm-keep:hover { background: rgba(217, 119, 87, 0.1); }
```

(Check `styles.css` for the actual accent color variable name near the top `:root` block — use whatever token the codebase already defines for the primary/accent color instead of `--accent` if it's named differently.)

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open a pane, click the X — confirm the dialog now always appears (even on an idle pane) with three buttons, and visually check the new button's styling against Cancel/Fechar.

- [ ] **Step 6: Commit**

Use the `/commit` skill. Stage the four modified files, message `feat: add keep-running option to pane close dialog`.

---

### Task 3: Skip fit while hidden

**Files:**
- Modify: `src/renderer/src/components/TerminalPane.jsx`

**Interfaces:**
- Consumes: new `hidden` prop (boolean, passed from `PaneGrid` in Task 4).
- Produces: none consumed elsewhere.

- [ ] **Step 1: Accept `hidden` prop and track it in a ref**

Add `hidden` to the destructured props. Add a ref next to the other refs (near `activeRef`):

```js
const hiddenRef = useRef(hidden);
hiddenRef.current = hidden;
```

- [ ] **Step 2: Store the `FitAddon` instance in a ref usable outside the mount effect**

The mount effect already creates `const fit = new FitAddon();` (`TerminalPane.jsx:47`). Add a ref before the mount effect:

```js
const fitRef = useRef(null);
```

Inside the mount effect, right after `const fit = new FitAddon();`, add `fitRef.current = fit;`.

- [ ] **Step 3: Guard the ResizeObserver's fit call**

Replace the `ResizeObserver` callback (`TerminalPane.jsx:85`):

```js
const resizeObserver = new ResizeObserver(() => {
  if (!hiddenRef.current) fit.fit();
});
```

- [ ] **Step 4: Refit when transitioning from hidden to visible**

Add a new effect after the theme effect (`TerminalPane.jsx:109-111`):

```js
useEffect(() => {
  if (!hidden) fitRef.current?.fit();
}, [hidden]);
```

- [ ] **Step 5: Manual verification**

Deferred to Task 4's verification step (needs the hidden container wired up in `PaneGrid` to actually exercise this path).

- [ ] **Step 6: Commit**

Use the `/commit` skill. Stage `src/renderer/src/components/TerminalPane.jsx`, message `fix: skip terminal fit while pane is hidden`.

---

### Task 4: Grid rendering — background container, wire `onHide`/`hidden` through

**Files:**
- Modify: `src/renderer/src/components/PaneGrid.jsx`
- Modify: `src/renderer/src/styles.css`

**Interfaces:**
- Consumes: `onHide` from `App.jsx` (Task 1), `hidden`/`onHide` props on `TerminalPane` (Tasks 2-3).
- Produces: none consumed elsewhere — this is the top-level wiring task.

- [ ] **Step 1: Add the `.pane-background` CSS rule**

In `src/renderer/src/styles.css`, after the `.pane-grid.layout-4` rule (line 495), add:

```css
.pane-background { display: none; }
```

- [ ] **Step 2: Split panes into visible/hidden and render both groups**

Replace `PaneGrid.jsx` in full:

```jsx
import TerminalPane from './TerminalPane.jsx';

export default function PaneGrid({ panes, focusedId, onFocus, onClose, onHide, onNewHere, canOpen, fontSize, theme, t }) {
  const visible = panes.filter((p) => !p.hidden);
  const background = panes.filter((p) => p.hidden);

  const renderPane = (pane) => (
    <TerminalPane
      key={pane.paneId}
      pane={pane}
      hidden={pane.hidden}
      focused={pane.paneId === focusedId}
      onFocus={() => onFocus(pane.paneId)}
      onClose={() => onClose(pane.paneId)}
      onHide={() => onHide(pane.paneId)}
      onNewHere={pane.cwd && canOpen ? () => onNewHere(pane.cwd, pane.title) : null}
      fontSize={fontSize}
      theme={theme}
      t={t}
    />
  );

  return (
    <main id="pane-area">
      <div className={`pane-grid layout-${visible.length}`}>
        {visible.map(renderPane)}
      </div>
      {background.length > 0 && (
        <div className="pane-background">
          {background.map(renderPane)}
        </div>
      )}
      {visible.length === 0 && (
        <div className="empty-state">
          <div className="empty-title">{t('empty.title')}</div>
          <div className="empty-sub">{t('empty.sub')}</div>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Manual verification (full feature)**

Run `npm run dev`:
1. Open a session from the sidebar, let it print something, click X → "Fechar e continuar executando" → pane disappears from the grid, other panes (if any) reflow to fill the space.
2. Click the same session in the sidebar again → pane reappears instantly at the same PTY state (no `claude --resume` re-run — check main process logs / the fact that Claude's conversation didn't restart).
3. With 4 visible panes open, hide one → confirm a 5th can now be opened (slot freed); hide two → confirm the sidebar shows the sessions as still "open" (`session-open-tag`).
4. Delete a session from the sidebar context menu while its pane is hidden → confirm the pane fully disappears (PTY killed), not just re-shown.

- [ ] **Step 4: Commit**

Use the `/commit` skill. Stage `src/renderer/src/components/PaneGrid.jsx` and `src/renderer/src/styles.css`, message `feat: render hidden panes off-grid to keep them running`.

---

### Task 5: Release build

**Files:** none (build/release step only)

- [ ] **Step 1: Bump version**

In `package.json`, bump `"version"` (e.g. `0.5.4` → `0.5.5`).

- [ ] **Step 2: Run the full release, not just dist**

```bash
npm run release
```

(Per project convention: ship updates via full release so existing installs auto-update — `npm run dist` alone does not publish.)

- [ ] **Step 3: Commit the version bump**

Use the `/commit` skill. Stage `package.json` (and `package-lock.json` if it changed), message `chore: bump version to 0.5.5`.

- [ ] **Step 4: Push**

Only after the user confirms — `git push`.
