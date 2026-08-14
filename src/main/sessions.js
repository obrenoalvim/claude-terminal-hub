import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const MAX_SESSIONS = 200;
// Session lines can carry large fields (hook/system-reminder text) before "cwd",
// so the head chunk has to be generous enough to still contain it.
const HEAD_BYTES = 65536;
const TAIL_BYTES = 16384;

function readChunk(fd, size, position) {
  const buf = Buffer.alloc(size);
  const bytesRead = fs.readSync(fd, buf, 0, size, position);
  return buf.toString('utf8', 0, bytesRead);
}

function lastJsonWithField(text, field) {
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line || line[0] !== '{') continue;
    try {
      const obj = JSON.parse(line);
      if (obj[field] !== undefined) return obj;
    } catch { /* partial/truncated line, skip */ }
  }
  return null;
}

// Regex-based, not line/JSON-based: a truncated head chunk can cut a huge
// preceding field mid-value, so the "cwd" line itself may never fully parse.
// Matching the field directly sidesteps that.
function extractStringField(text, field) {
  const m = text.match(new RegExp(`"${field}":"((?:\\\\.|[^"\\\\])*)"`));
  if (!m) return null;
  try { return JSON.parse(`"${m[1]}"`); } catch { return null; }
}

function readSession(filePath, stat) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const headText = readChunk(fd, Math.min(HEAD_BYTES, stat.size), 0);
    const tailSize = Math.min(TAIL_BYTES, stat.size);
    const tailText = readChunk(fd, tailSize, Math.max(0, stat.size - tailSize));

    const cwd = extractStringField(headText, 'cwd');
    const gitBranch = extractStringField(headText, 'gitBranch');
    const titleObj = lastJsonWithField(tailText, 'aiTitle');
    const promptObj = lastJsonWithField(tailText, 'lastPrompt');

    return {
      id: path.basename(filePath, '.jsonl'),
      cwd,
      project: cwd ? (path.basename(cwd) || cwd) : 'unknown',
      gitBranch,
      title: titleObj ? titleObj.aiTitle : null,
      preview: promptObj ? promptObj.lastPrompt : null,
      mtime: stat.mtimeMs,
    };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

export function listSessions() {
  const sessions = [];
  let projectDirs;
  try {
    projectDirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return sessions;
  }

  for (const dirent of projectDirs) {
    if (!dirent.isDirectory()) continue;
    const projectPath = path.join(PROJECTS_DIR, dirent.name);
    let files;
    try {
      files = fs.readdirSync(projectPath);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const full = path.join(projectPath, file);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (stat.size === 0) continue;
      const session = readSession(full, stat);
      if (session && session.cwd) sessions.push(session);
    }
  }

  sessions.sort((a, b) => b.mtime - a.mtime);
  return sessions.slice(0, MAX_SESSIONS);
}
