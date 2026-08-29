import TerminalPane from './TerminalPane.jsx';

export default function PaneGrid({ panes, focusedId, onFocus, onClose, onNewHere, canOpen, fontSize, theme, t }) {
  return (
    <main id="pane-area">
      <div className={`pane-grid layout-${panes.length}`}>
        {panes.map((pane) => (
          <TerminalPane
            key={pane.paneId}
            pane={pane}
            focused={pane.paneId === focusedId}
            onFocus={() => onFocus(pane.paneId)}
            onClose={() => onClose(pane.paneId)}
            onNewHere={pane.cwd && canOpen ? () => onNewHere(pane.cwd, pane.title) : null}
            fontSize={fontSize}
            theme={theme}
            t={t}
          />
        ))}
      </div>
      {panes.length === 0 && (
        <div className="empty-state">
          <div className="empty-title">{t('empty.title')}</div>
          <div className="empty-sub">{t('empty.sub')}</div>
        </div>
      )}
    </main>
  );
}
