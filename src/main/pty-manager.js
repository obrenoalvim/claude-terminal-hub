import os from 'node:os';
import fs from 'node:fs';
import pty from 'node-pty';

const SHELL = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');

const ptys = new Map(); // paneId -> pty process

export function startPty(paneId, { cwd, cols, rows, command }, onData, onExit) {
  if (ptys.has(paneId)) return;

  const resolvedCwd = cwd && fs.existsSync(cwd) ? cwd : os.homedir();
  const term = pty.spawn(SHELL, [], {
    name: 'xterm-256color',
    cols: cols || 80,
    rows: rows || 24,
    cwd: resolvedCwd,
    env: process.env,
  });

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
