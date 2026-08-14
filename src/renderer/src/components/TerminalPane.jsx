import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';

const THEMES = {
  dark: {
    background: '#08090c',
    foreground: '#e7e8ee',
    cursor: '#d97757',
    selectionBackground: 'rgba(217,119,87,0.35)',
  },
  light: {
    background: '#ffffff',
    foreground: '#1c1d24',
    cursor: '#c9663f',
    selectionBackground: 'rgba(201,102,63,0.25)',
  },
};

const ACTIVITY_DECAY_MS = 1500;

export default function TerminalPane({ pane, focused, onFocus, onClose, onNewHere, fontSize, theme }) {
  const bodyRef = useRef(null);
  const dotRef = useRef(null);
  const termRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const activityTimerRef = useRef(null);
  const { paneId, title, cwd, command, shell } = pane;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const term = new Terminal({
      fontFamily: '"Cascadia Code", "JetBrains Mono", Consolas, monospace',
      fontSize: fontSize || 13,
      cursorBlink: true,
      theme: THEMES[theme] || THEMES.dark,
    });
    termRef.current = term;
    const fit = new FitAddon();
    const search = new SearchAddon();
    searchRef.current = search;
    term.loadAddon(fit);
    term.loadAddon(search);
    term.open(bodyRef.current);
    fit.fit();

    window.api.startPty(paneId, { cwd, cols: term.cols, rows: term.rows, command, shell });

    const offData = window.api.onPtyData(paneId, (data) => {
      term.write(data);
      dotRef.current?.classList.add('active');
      clearTimeout(activityTimerRef.current);
      activityTimerRef.current = setTimeout(() => dotRef.current?.classList.remove('active'), ACTIVITY_DECAY_MS);
      if (data.includes('\x07') && !document.hasFocus()) {
        try { new Notification('Claude Terminal Hub', { body: `${title}: precisa de atenção` }); } catch { /* notifications may be unavailable */ }
      }
    });
    const offExit = window.api.onPtyExit(paneId, () => {
      dotRef.current?.classList.add('dead');
      if (!document.hasFocus()) {
        try { new Notification('Claude Terminal Hub', { body: `${title}: terminal encerrado` }); } catch { /* notifications may be unavailable */ }
      }
    });

    const onInput = term.onData((data) => window.api.sendInput(paneId, data));
    const onResize = term.onResize(({ cols, rows }) => window.api.resizePty(paneId, cols, rows));

    const resizeObserver = new ResizeObserver(() => fit.fit());
    resizeObserver.observe(bodyRef.current);

    term.focus();

    return () => {
      clearTimeout(activityTimerRef.current);
      resizeObserver.disconnect();
      onInput.dispose();
      onResize.dispose();
      offData();
      offExit();
      window.api.killPty(paneId);
      term.dispose();
    };
    // paneId identity never changes across this pane's lifetime; the rest are its launch params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId]);

  useEffect(() => {
    if (termRef.current && fontSize) termRef.current.options.fontSize = fontSize;
  }, [fontSize]);

  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = THEMES[theme] || THEMES.dark;
  }, [theme]);

  useEffect(() => {
    function onToggleSearch(e) {
      if (e.detail?.paneId !== paneId) return;
      setSearchOpen((open) => !open);
    }
    window.addEventListener('terminal:toggle-search', onToggleSearch);
    return () => window.removeEventListener('terminal:toggle-search', onToggleSearch);
  }, [paneId]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
    else termRef.current?.focus();
  }, [searchOpen]);

  const runSearch = (dir) => {
    if (!searchQuery) return;
    if (dir === 'next') searchRef.current?.findNext(searchQuery);
    else searchRef.current?.findPrevious(searchQuery);
  };

  return (
    <div className={`pane${focused ? ' focused' : ''}`} onMouseDown={onFocus}>
      <div className="pane-head">
        <div className="pane-title">
          <span className="pane-dot" ref={dotRef} />
          <span className="pane-title-text">{title}</span>
        </div>
        <div className="pane-actions">
          {onNewHere && (
            <button
              className="pane-action"
              title="Abrir novo terminal nesta pasta"
              onClick={(e) => { e.stopPropagation(); onNewHere(); }}
            >
              +
            </button>
          )}
          <button className="pane-close" title="Fechar" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            ✕
          </button>
        </div>
      </div>
      {searchOpen && (
        <div className="pane-search" onMouseDown={(e) => e.stopPropagation()}>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar no terminal…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch(e.shiftKey ? 'prev' : 'next');
              else if (e.key === 'Escape') setSearchOpen(false);
            }}
          />
          <button title="Anterior" onClick={() => runSearch('prev')}>↑</button>
          <button title="Próxima" onClick={() => runSearch('next')}>↓</button>
          <button title="Fechar busca" onClick={() => setSearchOpen(false)}>✕</button>
        </div>
      )}
      <div className="pane-body" ref={bodyRef} />
    </div>
  );
}
