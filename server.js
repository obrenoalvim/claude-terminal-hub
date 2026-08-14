const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const pty = require('node-pty');

const PORT = process.env.PORT || 4173;
const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const SHELL = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');
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

function listSessions() {
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

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/xterm', express.static(path.join(__dirname, 'node_modules', '@xterm', 'xterm')));
app.use('/vendor/addon-fit', express.static(path.join(__dirname, 'node_modules', '@xterm', 'addon-fit')));

app.get('/api/sessions', (req, res) => {
  res.json(listSessions());
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/pty' });

wss.on('connection', (ws) => {
  let term = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'start' && !term) {
      const cwd = msg.cwd && fs.existsSync(msg.cwd) ? msg.cwd : os.homedir();
      term = pty.spawn(SHELL, [], {
        name: 'xterm-256color',
        cols: msg.cols || 80,
        rows: msg.rows || 24,
        cwd,
        env: process.env,
      });
      term.onData((data) => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'data', data }));
      });
      term.onExit(() => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'exit' }));
      });
      if (msg.command) {
        term.write(msg.command + '\r');
      }
      return;
    }

    if (!term) return;

    if (msg.type === 'input') {
      term.write(msg.data);
    } else if (msg.type === 'resize') {
      try {
        term.resize(msg.cols, msg.rows);
      } catch { /* pty may already be gone */ }
    }
  });

  ws.on('close', () => {
    if (term) {
      try { term.kill(); } catch { /* already dead */ }
      term = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`claude-terminal-hub running at http://localhost:${PORT}`);
});
