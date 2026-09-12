import TerminalPane from './TerminalPane.jsx';

export default function PaneGrid({ panes, focusedId, onFocus, onClose, onHide, onNewHere, canOpen, fontSize, theme, t }) {
  const visible = panes.filter((p) => !p.hidden);
  const background = panes.filter((p) => p.hidden);

  const renderPane = (pane) => (
    <TerminalPane
      key={pane.paneId}
      pane={pane}
      hidden={pane.hidden}
      focused={pane.paneId === focusedId}
      onFocus={() => onFocus(pane.paneId)}
      onClose={() => onClose(pane.paneId)}
      onHide={() => onHide(pane.paneId)}
      onNewHere={pane.cwd && canOpen ? () => onNewHere(pane.cwd, pane.title) : null}
      fontSize={fontSize}
      theme={theme}
      t={t}
    />
  );

  return (
    <main id="pane-area">
      <div className={`pane-grid layout-${visible.length}`}>
        {visible.map(renderPane)}
      </div>
      {background.length > 0 && (
        <div className="pane-background">
          {background.map(renderPane)}
        </div>
      )}
      {visible.length === 0 && (
        <div className="empty-state">
          <div className="empty-title">{t('empty.title')}</div>
          <div className="empty-sub">{t('empty.sub')}</div>
        </div>
      )}
    </main>
  );
}
