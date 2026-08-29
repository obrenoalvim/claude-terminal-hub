import { useEffect, useMemo, useState } from 'react';

const SHELL_CHOICES = [
  { key: 'powershell', label: 'shell.powershell' },
  { key: 'cmd', label: 'shell.cmd' },
  { key: 'gitbash', label: 'shell.gitbash' },
  { key: 'wsl', label: 'shell.wsl' },
];

function timeAgo(ms, t) {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('time.now');
  if (min < 60) return t('time.minutesAgo', { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t('time.hoursAgo', { n: hr });
  const day = Math.floor(hr / 24);
  return t('time.daysAgo', { n: day });
}

export default function Sidebar({ collapsed, onToggleCollapse, onOpenSession, openSessionIds, onNewShell, onOpenTerminalHere, canOpen, onOpenSettings, onSessionDeleted, t }) {
  const [sessions, setSessions] = useState(null); // null = loading
  const [query, setQuery] = useState('');
  const [shellMenuOpen, setShellMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, session }
  const [confirmDelete, setConfirmDelete] = useState(null); // session pending delete
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const load = () => {
    setSessions(null);
    window.api.listSessions().then(setSessions).catch(() => setSessions([]));
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleDelete = async () => {
    const session = confirmDelete;
    setConfirmDelete(null);
    await window.api.deleteSession(session.id);
    setSessions((prev) => (prev ? prev.filter((s) => s.id !== session.id) : prev));
    onSessionDeleted?.(session.id);
  };

  const submitRename = async () => {
    const id = renamingId;
    const value = renameValue;
    setRenamingId(null);
    await window.api.renameSession(id, value);
    load();
  };

  const togglePin = async (session) => {
    const pinned = !session.pinned;
    await window.api.pinSession(session.id, pinned);
    setSessions((prev) =>
      prev
        ? [...prev]
            .map((s) => (s.id === session.id ? { ...s, pinned } : s))
            .sort((a, b) => (b.pinned - a.pinned) || (b.mtime - a.mtime))
        : prev
    );
  };

  useEffect(load, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => closeContextMenu();
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

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
          <button id="refresh-btn" title={t('sidebar.refresh')} onClick={load}>↻</button>
          <button id="settings-btn" title={t('sidebar.settings')} onClick={onOpenSettings}>⚙</button>
          <button
            id="collapse-btn"
            title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            onClick={onToggleCollapse}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
      </div>

      <div className="new-shell-wrap">
        <button
          className="new-shell-btn"
          disabled={!canOpen}
          onClick={() => onNewShell('powershell')}
          title={t('sidebar.newTerminalPowershell')}
        >
          <span className="icon">+</span>
          <span className="label">{t('sidebar.newTerminal')}</span>
        </button>
        <button
          className="new-shell-caret"
          disabled={!canOpen}
          title={t('sidebar.pickShell')}
          onClick={() => setShellMenuOpen((o) => !o)}
        >
          ▾
        </button>
        {shellMenuOpen && (
          <div className="shell-menu" onMouseLeave={() => setShellMenuOpen(false)}>
            {SHELL_CHOICES.map((s) => (
              <button
                key={s.key}
                className="shell-menu-item"
                onClick={() => { onNewShell(s.key); setShellMenuOpen(false); }}
              >
                {t(s.label)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="search-wrap">
        <input
          className="search-input"
          type="text"
          placeholder={t('sidebar.searchPlaceholder')}
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-section-label">{t('sidebar.recentSessions')}</div>
      <div className="session-list">
        {sessions === null && <div className="session-empty">{t('session.loading')}</div>}
        {sessions && sessions.length === 0 && (
          <div className="session-empty">{t('session.emptyNone')}</div>
        )}
        {sessions && sessions.length > 0 && filtered.length === 0 && (
          <div className="session-empty">{t('session.emptyNoMatch')}</div>
        )}
        {filtered.map((s) => {
          const isOpen = openSessionIds?.has(s.id);
          return (
            <div
              key={s.id}
              className={`session-item${canOpen || isOpen ? '' : ' disabled'}${isOpen ? ' open' : ''}${s.pinned ? ' pinned' : ''}`}
              onClick={() => (canOpen || isOpen) && onOpenSession(s)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, session: s });
              }}
            >
              <div className="session-title">
                {renamingId === s.id ? (
                  <input
                    className="session-title-input"
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); submitRename(); }
                      else if (e.key === 'Escape') { e.preventDefault(); setRenamingId(null); }
                    }}
                    onBlur={() => setRenamingId(null)}
                  />
                ) : (
                  <>
                    {s.pinned && <span className="session-pin-icon">📌</span>}
                    {s.title || s.preview || s.id}
                    {isOpen && <span className="session-open-tag">{t('session.open')}</span>}
                  </>
                )}
              </div>
              <div className="session-preview">{s.preview || ''}</div>
              <div className="session-meta">
                <span className="session-project" title={s.cwd}>{s.project}</span>
                <span className="session-time">{timeAgo(s.mtime, t)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <div
          className="session-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="session-context-menu-item"
            disabled={!canOpen}
            onClick={() => {
              onOpenTerminalHere(contextMenu.session);
              closeContextMenu();
            }}
          >
            {t('session.openTerminalHere')}
          </button>
          <button
            className="session-context-menu-item"
            onClick={() => {
              togglePin(contextMenu.session);
              closeContextMenu();
            }}
          >
            {contextMenu.session.pinned ? t('session.unpin') : t('session.pin')}
          </button>
          <button
            className="session-context-menu-item"
            onClick={() => {
              const session = contextMenu.session;
              setRenamingId(session.id);
              setRenameValue(session.title || session.preview || '');
              closeContextMenu();
            }}
          >
            {t('session.rename')}
          </button>
          <button
            className="session-context-menu-item danger"
            onClick={() => {
              setConfirmDelete(contextMenu.session);
              closeContextMenu();
            }}
          >
            {t('session.delete')}
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="settings-overlay" onMouseDown={() => setConfirmDelete(null)}>
          <div className="session-delete-confirm" onMouseDown={(e) => e.stopPropagation()}>
            <p>{t('session.deleteConfirm', { name: confirmDelete.title || confirmDelete.preview || confirmDelete.id })}</p>
            <div className="pane-confirm-actions">
              <button className="pane-confirm-cancel" onClick={() => setConfirmDelete(null)}>{t('pane.cancel')}</button>
              <button className="pane-confirm-ok" onClick={handleDelete}>{t('session.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
