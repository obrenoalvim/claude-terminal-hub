import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import PaneGrid from './components/PaneGrid.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { translate, DEFAULT_LANG } from '../../shared/i18n.js';

const MAX_PANES = 4;
const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const SKIP_PERMISSIONS_KEY = 'settings.skipPermissions';
const PANES_KEY = 'openPanes';
const FONT_SIZE_KEY = 'settings.fontSize';
const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 28;
const THEME_KEY = 'settings.theme';
const LANG_KEY = 'settings.language';
const SHELL_LABELS = {
  powershell: 'shell.powershell',
  cmd: 'shell.cmdShort',
  gitbash: 'shell.gitbash',
  wsl: 'shell.wsl',
};

function loadStoredPanes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PANES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, MAX_PANES) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [panes, setPanes] = useState(() =>
    loadStoredPanes().map((p, i) => ({ ...p, paneId: `pane-${i}` }))
  );
  const [focusedId, setFocusedId] = useState(() => (panes[panes.length - 1]?.paneId ?? null));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  );
  const [skipPermissions, setSkipPermissions] = useState(
    () => localStorage.getItem(SKIP_PERMISSIONS_KEY) !== '0'
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(
    () => Number(localStorage.getItem(FONT_SIZE_KEY)) || DEFAULT_FONT_SIZE
  );
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || DEFAULT_LANG);
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);
  const paneSeq = useRef(panes.length);
  const openSessionIds = useMemo(
    () => new Set(panes.map((p) => p.sessionId).filter(Boolean)),
    [panes]
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem(SKIP_PERMISSIONS_KEY, skipPermissions ? '1' : '0');
  }, [skipPermissions]);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    window.api.setLanguage(lang);
  }, [lang]);

  useEffect(() => {
    const toStore = panes.map(({ title, cwd, command, shell, sessionId }) => ({ title, cwd, command, shell, sessionId }));
    localStorage.setItem(PANES_KEY, JSON.stringify(toStore));
  }, [panes]);

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
  }, [fontSize]);

  const openPane = useCallback(({ title, cwd, command, shell, sessionId }) => {
    setPanes((prev) => {
      if (prev.length >= MAX_PANES) return prev;
      const paneId = `pane-${++paneSeq.current}`;
      setFocusedId(paneId);
      return [...prev, { paneId, title, cwd: cwd || null, command: command || null, shell: shell || null, sessionId: sessionId || null }];
    });
  }, []);

  const openSession = useCallback((session) => {
    setPanes((prev) => {
      const existing = prev.find((p) => p.sessionId === session.id);
      if (existing) {
        setFocusedId(existing.paneId);
        return prev;
      }
      if (prev.length >= MAX_PANES) return prev;
      const paneId = `pane-${++paneSeq.current}`;
      setFocusedId(paneId);
      return [...prev, {
        paneId,
        title: session.project,
        cwd: session.cwd,
        command: `claude --resume ${session.id}${skipPermissions ? ' --dangerously-skip-permissions' : ''}`,
        shell: null,
        sessionId: session.id,
      }];
    });
  }, [skipPermissions]);

  const closePane = useCallback((paneId) => {
    setPanes((prev) => prev.filter((p) => p.paneId !== paneId));
  }, []);

  const handleSessionDeleted = useCallback((sessionId) => {
    setPanes((prev) => prev.filter((p) => p.sessionId !== sessionId));
  }, []);

  useEffect(() => {
    function handleKeydown(e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();

      if (key === 't') {
        e.preventDefault();
        openPane({ title: t('shell.powershell'), cwd: null, command: null });
      } else if (key === 'w') {
        if (!focusedId) return;
        e.preventDefault();
        closePane(focusedId);
      } else if (e.key === 'Tab') {
        if (panes.length < 2) return;
        e.preventDefault();
        const idx = panes.findIndex((p) => p.paneId === focusedId);
        const next = panes[(idx + 1) % panes.length];
        if (next) setFocusedId(next.paneId);
      } else if (key === 'f') {
        if (!focusedId) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('terminal:toggle-search', { detail: { paneId: focusedId } }));
      } else if (key === '=' || key === '+') {
        e.preventDefault();
        setFontSize((s) => Math.min(s + 1, MAX_FONT_SIZE));
      } else if (key === '-' || key === '_') {
        e.preventDefault();
        setFontSize((s) => Math.max(s - 1, MIN_FONT_SIZE));
      } else if (key === '0') {
        e.preventDefault();
        setFontSize(DEFAULT_FONT_SIZE);
      }
    }
    window.addEventListener('keydown', handleKeydown, true);
    return () => window.removeEventListener('keydown', handleKeydown, true);
  }, [panes, focusedId, openPane, closePane, t]);

  return (
    <div id="app" className={sidebarCollapsed ? 'sidebar-collapsed' : ''}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onOpenSession={openSession}
        openSessionIds={openSessionIds}
        onNewShell={(shell) => openPane({ title: t(SHELL_LABELS[shell]) || t('shell.powershell'), cwd: null, command: null, shell })}
        onOpenTerminalHere={(session) => openPane({ title: session.project, cwd: session.cwd, command: null })}
        canOpen={panes.length < MAX_PANES}
        onOpenSettings={() => setSettingsOpen(true)}
        onSessionDeleted={handleSessionDeleted}
        t={t}
      />
      {settingsOpen && (
        <SettingsPanel
          skipPermissions={skipPermissions}
          onChangeSkipPermissions={setSkipPermissions}
          theme={theme}
          onChangeTheme={setTheme}
          lang={lang}
          onChangeLang={setLang}
          onClose={() => setSettingsOpen(false)}
          t={t}
        />
      )}
      <PaneGrid
        panes={panes}
        focusedId={focusedId}
        onFocus={setFocusedId}
        onClose={closePane}
        onNewHere={(cwd, title) => openPane({ title, cwd, command: null })}
        canOpen={panes.length < MAX_PANES}
        fontSize={fontSize}
        theme={theme}
        t={t}
      />
    </div>
  );
}
