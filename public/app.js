const MAX_PANES = 4;
const paneGrid = document.getElementById('pane-grid');
const emptyState = document.getElementById('empty-state');
const sessionList = document.getElementById('session-list');
const newShellBtn = document.getElementById('new-shell-btn');
const refreshBtn = document.getElementById('refresh-btn');

let panes = []; // { id, el, term, fit, ws, socketReady }
let paneSeq = 0;

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/pty`;
}

function updateLayout() {
  paneGrid.className = `pane-grid layout-${panes.length}`;
  emptyState.classList.toggle('hidden', panes.length > 0);
  newShellBtn.disabled = panes.length >= MAX_PANES;
  requestAnimationFrame(() => panes.forEach((p) => p.fit.fit()));
}

function focusPane(pane) {
  panes.forEach((p) => p.el.classList.toggle('focused', p === pane));
  pane.term.focus();
}

function closePane(pane) {
  try { pane.ws.close(); } catch { /* already closed */ }
  try { pane.term.dispose(); } catch { /* already disposed */ }
  pane.el.remove();
  panes = panes.filter((p) => p !== pane);
  updateLayout();
}

function openPane({ title, cwd, command }) {
  if (panes.length >= MAX_PANES) return;

  const id = ++paneSeq;
  const el = document.createElement('div');
  el.className = 'pane';
  el.innerHTML = `
    <div class="pane-head">
      <div class="pane-title"><span class="pane-dot"></span><span class="pane-title-text"></span></div>
      <button class="pane-close" title="Fechar">✕</button>
    </div>
    <div class="pane-body"></div>
  `;
  el.querySelector('.pane-title-text').textContent = title;
  paneGrid.appendChild(el);

  const term = new Terminal({
    fontFamily: '"Cascadia Code", "JetBrains Mono", Consolas, monospace',
    fontSize: 13,
    cursorBlink: true,
    theme: {
      background: '#08090c',
      foreground: '#e7e8ee',
      cursor: '#8b7cff',
      selectionBackground: 'rgba(139,124,255,0.35)',
    },
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(el.querySelector('.pane-body'));
  fit.fit();

  const ws = new WebSocket(wsUrl());
  const pane = { id, el, term, fit, ws };

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'start', cols: term.cols, rows: term.rows, cwd, command }));
  });

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'data') term.write(msg.data);
    if (msg.type === 'exit') el.querySelector('.pane-dot').classList.add('dead');
  });

  ws.addEventListener('close', () => {
    el.querySelector('.pane-dot').classList.add('dead');
  });

  term.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'input', data }));
  });

  term.onResize(({ cols, rows }) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'resize', cols, rows }));
  });

  el.addEventListener('mousedown', () => focusPane(pane));
  el.querySelector('.pane-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closePane(pane);
  });

  panes.push(pane);
  updateLayout();
  focusPane(pane);
  return pane;
}

newShellBtn.addEventListener('click', () => {
  openPane({ title: 'PowerShell', cwd: null, command: null });
});

refreshBtn.addEventListener('click', loadSessions);

window.addEventListener('resize', () => {
  panes.forEach((p) => p.fit.fit());
});

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h atrás`;
  const day = Math.floor(hr / 24);
  return `${day}d atrás`;
}

async function loadSessions() {
  sessionList.innerHTML = '<div class="session-empty">Carregando…</div>';
  try {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();
    renderSessions(sessions);
  } catch {
    sessionList.innerHTML = '<div class="session-empty">Falha ao carregar sessões.</div>';
  }
}

function renderSessions(sessions) {
  if (!sessions.length) {
    sessionList.innerHTML = '<div class="session-empty">Nenhuma sessão encontrada em ~/.claude/projects.</div>';
    return;
  }
  sessionList.innerHTML = '';
  for (const s of sessions) {
    const item = document.createElement('div');
    item.className = 'session-item';
    const title = s.title || s.preview || s.id;
    item.innerHTML = `
      <div class="session-title"></div>
      <div class="session-preview"></div>
      <div class="session-meta">
        <span class="session-project"></span>
        <span class="session-time"></span>
      </div>
    `;
    item.querySelector('.session-title').textContent = title;
    item.querySelector('.session-preview').textContent = s.preview || '';
    item.querySelector('.session-project').textContent = s.project;
    item.querySelector('.session-project').title = s.cwd;
    item.querySelector('.session-time').textContent = timeAgo(s.mtime);

    item.addEventListener('click', () => {
      if (panes.length >= MAX_PANES) return;
      openPane({
        title: s.project,
        cwd: s.cwd,
        command: `claude --resume ${s.id}`,
      });
    });

    sessionList.appendChild(item);
  }
}

loadSessions();
