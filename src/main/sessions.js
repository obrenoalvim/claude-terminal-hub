import os from 'node:os';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';

const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const NAMES_FILE = path.join(app.getPath('userData'), 'session-names.json');
const PINS_FILE = path.join(app.getPath('userData'), 'session-pins.json');
const MAX_SESSIONS = 200;
// Session lines can carry large fields (hook/system-reminder text) before "cwd",
// so the head chunk has to be generous enough to still contain it.
const HEAD_BYTES = 65536;
const TAIL_BYTES = 16384;

async function readChunk(fh, size, position) {
  const buf = Buffer.alloc(size);
  const { bytesRead } = await fh.read(buf, 0, size, position);
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

async function readSession(filePath, stat) {
  let fh;
  try {
    fh = await fsp.open(filePath, 'r');
    const tailSize = Math.min(TAIL_BYTES, stat.size);
    const [headText, tailText] = await Promise.all([
      readChunk(fh, Math.min(HEAD_BYTES, stat.size), 0),
      readChunk(fh, tailSize, Math.max(0, stat.size - tailSize)),
    ]);

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
    if (fh) await fh.close();
  }
}

async function readSessionsInDir(projectPath) {
  let files;
  try {
    files = await fsp.readdir(projectPath);
  } catch {
    return [];
  }

  const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));
  const results = await Promise.all(
    jsonlFiles.map(async (file) => {
      const full = path.join(projectPath, file);
      let stat;
      try {
        stat = await fsp.stat(full);
      } catch {
        return null;
      }
      if (stat.size === 0) return null;
      return readSession(full, stat);
    })
  );
  return results.filter((s) => s && s.cwd);
}

function loadNames() {
  try {
    return JSON.parse(fs.readFileSync(NAMES_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function renameSession(id, name) {
  const names = loadNames();
  const trimmed = (name || '').trim();
  if (trimmed) names[id] = trimmed;
  else delete names[id];
  fs.writeFileSync(NAMES_FILE, JSON.stringify(names));
  return true;
}

function loadPins() {
  try {
    return JSON.parse(fs.readFileSync(PINS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function pinSession(id, pinned) {
  const pins = new Set(loadPins());
  if (pinned) pins.add(id);
  else pins.delete(id);
  fs.writeFileSync(PINS_FILE, JSON.stringify([...pins]));
  return true;
}

export async function listSessions() {
  let projectDirs;
  try {
    projectDirs = await fsp.readdir(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirLists = await Promise.all(
    projectDirs
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => readSessionsInDir(path.join(PROJECTS_DIR, dirent.name)))
  );

  const sessions = dirLists.flat();
  const names = loadNames();
  const pins = new Set(loadPins());
  for (const s of sessions) {
    if (names[s.id]) s.title = names[s.id];
    s.pinned = pins.has(s.id);
  }
  sessions.sort((a, b) => (b.pinned - a.pinned) || (b.mtime - a.mtime));
  return sessions.slice(0, MAX_SESSIONS);
}

export function deleteSession(id) {
  let projectDirs;
  try {
    projectDirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const dirent of projectDirs) {
    if (!dirent.isDirectory()) continue;
    const filePath = path.join(PROJECTS_DIR, dirent.name, `${id}.jsonl`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  }
  return false;
}
