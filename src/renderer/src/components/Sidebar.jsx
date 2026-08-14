import { useEffect, useMemo, useState } from 'react';

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

export default function Sidebar({ collapsed, onToggleCollapse, onOpenSession, onNewShell, canOpen }) {
  const [sessions, setSessions] = useState(null); // null = loading
  const [query, setQuery] = useState('');

  const load = () => {
    setSessions(null);
    window.api.listSessions().then(setSessions).catch(() => setSessions([]));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) =>
      [s.title, s.preview, s.project, s.cwd].some((field) => field && field.toLowerCase().includes(q))
    );
  }, [sessions, query]);

  return (
    <aside id="sidebar" className={collapsed ? 'collapsed' : ''}>
      <div className="sidebar-head">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">Claude Terminal Hub</span>
        </div>
        <div className="sidebar-head-actions">
          <button id="refresh-btn" title="Atualizar sessões" onClick={load}>↻</button>
          <button
            id="collapse-btn"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            onClick={onToggleCollapse}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
      </div>

      <button className="new-shell-btn" disabled={!canOpen} onClick={onNewShell} title="Novo terminal">
        <span className="icon">+</span>
        <span className="label">Novo terminal</span>
      </button>

      <div className="search-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="Buscar sessão…"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-section-label">Sessões recentes</div>
      <div className="session-list">
        {sessions === null && <div className="session-empty">Carregando…</div>}
        {sessions && sessions.length === 0 && (
          <div className="session-empty">Nenhuma sessão encontrada em ~/.claude/projects.</div>
        )}
        {sessions && sessions.length > 0 && filtered.length === 0 && (
          <div className="session-empty">Nenhuma sessão bate com a busca.</div>
        )}
        {filtered.map((s) => (
          <div
            key={s.id}
            className={`session-item${canOpen ? '' : ' disabled'}`}
            onClick={() => canOpen && onOpenSession(s)}
          >
            <div className="session-title">{s.title || s.preview || s.id}</div>
            <div className="session-preview">{s.preview || ''}</div>
            <div className="session-meta">
              <span className="session-project" title={s.cwd}>{s.project}</span>
              <span className="session-time">{timeAgo(s.mtime)}</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
