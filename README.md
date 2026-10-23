<div align="center">

<img src="build/icon.svg" alt="Claude Terminal Hub logo" width="120" height="120">

# Claude Terminal Hub

**One window for all your Claude Code sessions.**<br>
Resume any session in the right folder with one click, in up to four real terminals side by side. A Windows desktop app.

[![Download for Windows](https://img.shields.io/badge/Download-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/obrenoalvim/claude-terminal-hub/releases/latest)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/obrenoalvim/claude-terminal-hub?style=flat&logo=github&color=e07a5f)](https://github.com/obrenoalvim/claude-terminal-hub/stargazers)
[![Latest release](https://img.shields.io/github/v/release/obrenoalvim/claude-terminal-hub?logo=github)](https://github.com/obrenoalvim/claude-terminal-hub/releases/latest)
[![Electron](https://img.shields.io/badge/Electron-2B2E3A?logo=electron&logoColor=9FEAF9)](#architecture)

**English** · [Português](README.pt.md)

[Features](#features) · [Quick start](#quick-start) · [Shortcuts](#keyboard-shortcuts) · [Requirements](#requirements) · [Architecture](#architecture) · [FAQ](#faq) · [Landing page](https://claude-terminal-hub.vercel.app)

</div>

---

A desktop app that turns "which folder was that Claude Code session in again?" into one click. It lists every recent Claude Code session across every project on your machine, in one place, and keeps up to 4 real terminals visible at once, side by side. Each one is a full PowerShell process, not a fake console.

Click a session in the sidebar and it opens a new pane already `cd`'d into that project and running `claude --resume <session-id>`. No more opening File Explorer, finding the right folder, opening a terminal there, and typing `claude --resume` by hand.

## Quick start

**[Download for Windows](https://github.com/obrenoalvim/claude-terminal-hub/releases/latest)**, run the installer, done. No `git clone`, no `npm install`, no build step.

The installer lets you pick the install directory and adds Desktop and Start Menu shortcuts. It needs no admin rights.

## Features

- **Cross-project session list**: scans `~/.claude/projects/*.jsonl` directly, no config needed. Searchable, sorted by most recent activity. Clicking a session already open in a pane focuses it instead of opening a duplicate.
- **Full-text search across conversations**: type in the search box and, besides matching titles and folders, the app searches what was said in every session (your prompts, Claude's replies and the tool calls). Matching sessions show up under "In conversations" with the snippet highlighted, and one click resumes them. Prefixes, small typos and accents are handled (`acao` finds "ação"). This is the search of [**Recall**](https://github.com/obrenoalvim/recall), built in, so there is nothing else to install.
- **One click to resume**: opens a new pane in the right folder and runs `claude --resume` for you.
- **Up to 4 terminal panes at once**, all visible together in a grid that reflows as you open and close panes (1, 2, 3, or 4), never hidden behind tabs. Real PTYs via `node-pty`, full interactivity: arrow keys, `vim`, Claude Code's own TUI, all work normally.
- **Panes survive an app restart**: what was open gets reopened (same folder/command) the next time you launch the app.
- **Open another terminal at an existing pane's path**, one click from that pane's header, for when you want a second shell next to a Claude session without hunting for the folder again.
- **Shell picker** for the blank-terminal button: PowerShell, cmd, Git Bash, or WSL, whichever's installed.
- **In-terminal search** (Ctrl+F) via xterm's search addon: jump between matches in a pane's scrollback.
- **Light/dark theme** and an **English/Portuguese UI**, both toggled in Settings. English by default.
- **Activity indicator** on each pane's status dot, and a confirmation prompt before closing a pane that had recent output, so you don't lose a running command to a stray click.
- **Desktop notification** when a pane exits or rings the terminal bell while the window isn't focused.
- **Auto-update**, checked on launch and every 4 hours while the app is open.
- Native Electron window: no browser tab, no server to remember to start.

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+T | New terminal |
| Ctrl+W | Close the focused pane |
| Ctrl+Tab | Cycle focus between panes |
| Ctrl+F | Search the focused pane |
| Ctrl+= / Ctrl+- / Ctrl+0 | Zoom in, out, reset |

## Requirements

- Windows. The app uses PowerShell and was built and tested there. A Linux or macOS shell would need `SHELL` to point somewhere sane, and that is untested.
- [Claude Code](https://claude.com/claude-code) installed and logged in, for the "resume session" buttons to do anything.
- Git Bash and/or WSL are optional. You only need them if you pick them from the shell picker. The app falls back to PowerShell if they're not installed.
- [Node.js](https://nodejs.org/) 18+, only to run the app from source.

## Install and run from source

Just want to use the app? Use the [download link above](https://github.com/obrenoalvim/claude-terminal-hub/releases/latest). The steps below are for building from source.

```powershell
git clone https://github.com/obrenoalvim/claude-terminal-hub.git
cd claude-terminal-hub
npm install
npm run dev
```

`npm run dev` starts it in development mode with hot reload. `npm run build` produces a production bundle under `out/`; `npm start` previews that build.

### Windows installer

`npm run dist` builds the app and packages it into a Windows installer (NSIS `.exe`) under `dist/`. The installer lets you pick the install directory and adds Desktop/Start Menu shortcuts, with no admin rights required (`oneClick: false`).

```powershell
npm install
npm run dist
```

The resulting `dist/Claude Terminal Hub Setup <version>.exe` is the file to hand out; everything else under `dist/` is intermediate build output.

### Releasing updates

The installed app checks GitHub Releases for a newer version on startup (`electron-updater`) and offers to restart and install it once downloaded. No manual reinstall is needed after the first install.

To publish a release: bump `version` in `package.json`, then run `npm run release` with a [`GH_TOKEN`](https://github.com/settings/tokens) (repo scope) in the environment. `GH_TOKEN=$(gh auth token) npm run release` works if you're already logged into the `gh` CLI. That builds the installer and uploads it plus the update metadata (`latest.yml`) to a new GitHub Release for the current tag. `npm run dist` (no token needed) builds locally without publishing.

**Note:** `electron-builder` creates the GitHub Release as a **draft**. A draft release is invisible to `electron-updater`, so existing installs won't see the update until it's published: `gh release edit vX.Y.Z --draft=false`.

The installer's filename is fixed (`Claude-Terminal-Hub-Setup.exe`, no version number), so the [download link above](https://github.com/obrenoalvim/claude-terminal-hub/releases/latest) always points at the latest build.

## Architecture

- **Main process** (`src/main`) owns the real work. `sessions.js` scans `~/.claude/projects` for session metadata, `pty-manager.js` owns the `node-pty` processes (one per open pane, spawning whichever shell was picked, with a graceful fallback if it's not installed), and `index.js` wires both up to `ipcMain` handlers, creates the window, and drives the periodic `electron-updater` check. `electron-log` is wired in here too, so crashes and pty-spawn failures land in a log file instead of vanishing.
- **Search** (`src/main/search`) turns each transcript into messages and keeps a [MiniSearch](https://lucaong.github.io/minisearch/) index in the main process, re-reading only the files whose modification time changed. It indexes prompts, Claude's text replies and one line per tool call, and skips tool results, thinking blocks, hook output and sub-agent traffic. The accent folding, snippet and highlight helpers live in `src/shared/text.ts`, so the sidebar can highlight matches. `npm test` runs its unit tests.
- **Preload** (`src/preload`) exposes a narrow `window.api` surface via `contextBridge` (list sessions, start/write/resize/kill a pty pane, subscribe to pty output, forward a renderer error to the main-process log). No Node or Electron internals leak into the renderer.
- **Renderer** (`src/renderer`) is a small React app: `Sidebar` (search + session list + shell picker), `PaneGrid` (lays out however many panes are open), `TerminalPane` (an [xterm.js](https://xtermjs.org/) instance, plus its search addon, wired to one pty via the preload API), and `SettingsPanel` (skip-permissions, theme, and language toggles). Open panes, font size, theme, language, and sidebar state persist to `localStorage` and rehydrate on launch. UI strings live in `src/shared/locales` (`en.js`/`pt.js`), shared between the renderer and the main process (native update dialogs) via `src/shared/i18n.js`.

Claude Code writes one `.jsonl` transcript per session, and each line already carries the working directory (`cwd`), an AI-generated title (`aiTitle`), and the last prompt you sent (`lastPrompt`). `sessions.js` reads only the first and last few KB of each file (not the whole transcript) to pull those out fast, sorts everything by modification time, and hands it to the renderer as JSON.

## Limitations

- Max 4 panes by design, to keep the layout readable.
- Closing a pane kills its shell. Panes with recent activity ask for confirmation first, idle ones close immediately.
- The activity indicator and close confirmation are approximate (based on recent pty output), not real shell integration ("is a command actually still running"). That would need OSC133 prompt markers, which no shell here emits by default.
- "Open another terminal here" only works for panes that were opened with a known path (a resumed session, or one opened from another pane). A blank shell defaults to your home folder and has nothing to copy.
- Keyboard shortcuts are fixed, not user-remappable.

---

## FAQ

**How does it find my sessions?**
It reads the `.jsonl` transcripts Claude Code writes under `~/.claude/projects`. It only reads the first and last few KB of each file to get the folder, the title and your last prompt.

**Does it work on macOS or Linux?**
It was built and tested on Windows. See [Requirements](#requirements).

**Is the conversation search the same as Recall?**
Yes. [Recall](https://github.com/obrenoalvim/recall) is the same search as a small standalone app, for people who only want to search their sessions. The Hub includes it from v0.6.0, in the sidebar search box.

**Why only four panes?**
By design, to keep the layout readable.

**What happens to a running command when I close a pane?**
Closing a pane kills its shell. Panes with recent output ask for confirmation first.

## More from the same author

- [**claude-code-wrapped**](https://github.com/obrenoalvim/claude-code-wrapped): turns your session history into a shareable poster.
- [**claude-usage-tray**](https://github.com/obrenoalvim/claude-usage-tray): a Windows tray icon with your Claude Code 5-hour usage.
- [**zero-drift**](https://github.com/obrenoalvim/zero-drift): a skill that keeps long sessions grounded.

## Contributing

Bug, idea or a shell that should be in the picker? Open an issue or a PR. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [changelog](CHANGELOG.md).

## License

[MIT](LICENSE)

---

<div align="center">

If this saved you a trip through File Explorer, a ⭐ helps other Claude Code users find it.

<sub>**Topics:** claude-code · claude · anthropic · terminal · electron · windows · pty · xterm-js · session-manager · developer-tools · productivity</sub>

</div>
