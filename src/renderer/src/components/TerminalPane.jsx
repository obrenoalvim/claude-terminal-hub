import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function TerminalPane({ pane, focused, onFocus, onClose, onNewHere }) {
  const bodyRef = useRef(null);
  const dotRef = useRef(null);
  const { paneId, title, cwd, command } = pane;

  useEffect(() => {
    const term = new Terminal({
      fontFamily: '"Cascadia Code", "JetBrains Mono", Consolas, monospace',
      fontSize: 13,
      cursorBlink: true,
      theme: {
        background: '#08090c',
        foreground: '#e7e8ee',
        cursor: '#d97757',
        selectionBackground: 'rgba(217,119,87,0.35)',
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(bodyRef.current);
    fit.fit();

    window.api.startPty(paneId, { cwd, cols: term.cols, rows: term.rows, command });

    const offData = window.api.onPtyData(paneId, (data) => term.write(data));
    const offExit = window.api.onPtyExit(paneId, () => dotRef.current?.classList.add('dead'));

    const onInput = term.onData((data) => window.api.sendInput(paneId, data));
    const onResize = term.onResize(({ cols, rows }) => window.api.resizePty(paneId, cols, rows));

    const resizeObserver = new ResizeObserver(() => fit.fit());
    resizeObserver.observe(bodyRef.current);

    term.focus();

    return () => {
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
      <div className="pane-body" ref={bodyRef} />
    </div>
  );
}
