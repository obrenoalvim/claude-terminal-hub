import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import PaneGrid from './components/PaneGrid.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';

const MAX_PANES = 4;
const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';
const SKIP_PERMISSIONS_KEY = 'settings.skipPermissions';
const PANES_KEY = 'openPanes';
const FONT_SIZE_KEY = 'settings.fontSize';
const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 28;
const THEME_KEY = 'settings.theme';
const SHELL_LABELS = {
  powershell: 'PowerShell',
  cmd: 'Prompt',
  gitbash: 'Git Bash',
  wsl: 'WSL',
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
  const paneSeq = useRef(panes.length);

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
    const toStore = panes.map(({ title, cwd, command, shell }) => ({ title, cwd, command, shell }));
    localStorage.setItem(PANES_KEY, JSON.stringify(toStore));
  }, [panes]);

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
  }, [fontSize]);

  const openPane = useCallback(({ title, cwd, command, shell }) => {
    setPanes((prev) => {
      if (prev.length >= MAX_PANES) return prev;
      const paneId = `pane-${++paneSeq.current}`;
      setFocusedId(paneId);
      return [...prev, { paneId, title, cwd: cwd || null, command: command || null, shell: shell || null }];
    });
  }, []);

  const closePane = useCallback((paneId) => {
    setPanes((prev) => prev.filter((p) => p.paneId !== paneId));
  }, []);

  useEffect(() => {
    function handleKeydown(e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();

      if (key === 't') {
        e.preventDefault();
        openPane({ title: 'PowerShell', cwd: null, command: null });
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
  }, [panes, focusedId, openPane, closePane]);

  return (
    <div id="app" className={sidebarCollapsed ? 'sidebar-collapsed' : ''}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onOpenSession={(session) =>
          openPane({
            title: session.project,
            cwd: session.cwd,
            command: `claude --resume ${session.id}${skipPermissions ? ' --dangerously-skip-permissions' : ''}`,
          })
        }
        onNewShell={(shell) => openPane({ title: SHELL_LABELS[shell] || 'PowerShell', cwd: null, command: null, shell })}
        canOpen={panes.length < MAX_PANES}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      {settingsOpen && (
        <SettingsPanel
          skipPermissions={skipPermissions}
          onChangeSkipPermissions={setSkipPermissions}
          theme={theme}
          onChangeTheme={setTheme}
          onClose={() => setSettingsOpen(false)}
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
      />
    </div>
  );
}
