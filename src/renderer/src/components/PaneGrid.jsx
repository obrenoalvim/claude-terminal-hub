import TerminalPane from './TerminalPane.jsx';

export default function PaneGrid({ panes, focusedId, onFocus, onClose, onNewHere, canOpen, fontSize, theme }) {
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
          />
        ))}
      </div>
      {panes.length === 0 && (
        <div className="empty-state">
          <div className="empty-title">Nenhum terminal aberto</div>
          <div className="empty-sub">Escolha uma sessão à esquerda ou abra um terminal novo. Até 4 de uma vez.</div>
        </div>
      )}
    </main>
  );
}
