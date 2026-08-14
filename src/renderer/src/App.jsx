import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import PaneGrid from './components/PaneGrid.jsx';

const MAX_PANES = 4;
const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

export default function App() {
  const [panes, setPanes] = useState([]);
  const [focusedId, setFocusedId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  );
  const paneSeq = useRef(0);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  const openPane = useCallback(({ title, cwd, command }) => {
    setPanes((prev) => {
      if (prev.length >= MAX_PANES) return prev;
      const paneId = `pane-${++paneSeq.current}`;
      setFocusedId(paneId);
      return [...prev, { paneId, title, cwd: cwd || null, command: command || null }];
    });
  }, []);

  const closePane = useCallback((paneId) => {
    setPanes((prev) => prev.filter((p) => p.paneId !== paneId));
  }, []);

  return (
    <div id="app" className={sidebarCollapsed ? 'sidebar-collapsed' : ''}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onOpenSession={(session) =>
          openPane({ title: session.project, cwd: session.cwd, command: `claude --resume ${session.id}` })
        }
        onNewShell={() => openPane({ title: 'PowerShell', cwd: null, command: null })}
        canOpen={panes.length < MAX_PANES}
      />
      <PaneGrid
        panes={panes}
        focusedId={focusedId}
        onFocus={setFocusedId}
        onClose={closePane}
        onNewHere={(cwd, title) => openPane({ title, cwd, command: null })}
        canOpen={panes.length < MAX_PANES}
      />
    </div>
  );
}
