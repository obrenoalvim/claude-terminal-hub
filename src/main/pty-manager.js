import os from 'node:os';
import fs from 'node:fs';
import pty from 'node-pty';
import log from 'electron-log/main';

const SHELL = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');

const GIT_BASH_CANDIDATES = [
  'C:\\Program Files\\Git\\bin\\bash.exe',
  'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
];
const GIT_BASH = GIT_BASH_CANDIDATES.find((p) => fs.existsSync(p)) || null;

// wsl.exe/cmd.exe/powershell.exe are resolved via PATH/System32, so no existsSync check;
// Git Bash is a real filesystem path and may not be installed, so it's verified above.
const SHELL_OPTIONS = {
  powershell: 'powershell.exe',
  cmd: 'cmd.exe',
  gitbash: GIT_BASH,
  wsl: 'wsl.exe',
};

function resolveShell(shell) {
  if (process.platform !== 'win32') return SHELL;
  return SHELL_OPTIONS[shell] || SHELL;
}

const ptys = new Map(); // paneId -> pty process

export function startPty(paneId, { cwd, cols, rows, command, shell }, onData, onExit) {
  if (ptys.has(paneId)) return;

  const resolvedCwd = cwd && fs.existsSync(cwd) ? cwd : os.homedir();
  let term;
  try {
    term = pty.spawn(resolveShell(shell), [], {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: resolvedCwd,
      env: process.env,
    });
  } catch (err) {
    log.error(`Failed to spawn shell for pane ${paneId}`, err);
    onData(`\r\n[erro ao iniciar shell: ${err.message}]\r\n`);
    onExit();
    return;
  }

  term.onData((data) => onData(data));
  term.onExit(() => {
    ptys.delete(paneId);
    onExit();
  });

  if (command) term.write(command + '\r');
  ptys.set(paneId, term);
}

export function writeToPty(paneId, data) {
  ptys.get(paneId)?.write(data);
}

export function resizePty(paneId, cols, rows) {
  try {
    ptys.get(paneId)?.resize(cols, rows);
  } catch { /* pty may already be gone */ }
}

export function killPty(paneId) {
  const term = ptys.get(paneId);
  if (!term) return;
  try { term.kill(); } catch { /* already dead */ }
  ptys.delete(paneId);
}

export function killAllPtys() {
  for (const id of ptys.keys()) killPty(id);
}
