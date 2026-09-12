# TODO Improvements

Queued items from autonomous review passes. Applied directly when safe (bug fixes,
dead code removal, copy fixes); logged here when they need a judgment call.

### Add a test suite

- **Category:** Test
- **What:** The project has zero test infrastructure (no test runner installed, no
  `test` script in `package.json`, no `.github` CI). `sessions.js` (the `.jsonl`
  head/tail parsing logic — `extractStringField`, `lastJsonWithField`, `readSession`)
  is pure-ish and the highest-value target: it has subtle truncation-safety comments
  in the code but nothing verifying them.
- **Where:** `src/main/sessions.js`; new `vitest` (or `node:test`) setup.
- **Why:** No shipped behavior is currently covered, so refactors of the session
  parser (a hot area — three UX passes have already touched it) have no safety net.
- **Risk:** Low risk to add, but picking a runner/mocking strategy for Electron's
  `app` module (used in `sessions.js` for `userData` paths) is a real design
  decision, and the task briefing for this pass excluded adding new dependencies.
- **Effort:** Medium
