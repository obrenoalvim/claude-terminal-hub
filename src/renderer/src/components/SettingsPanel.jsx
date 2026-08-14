export default function SettingsPanel({ skipPermissions, onChangeSkipPermissions, theme, onChangeTheme, onClose }) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <span>Configurações</span>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={skipPermissions}
            onChange={(e) => onChangeSkipPermissions(e.target.checked)}
          />
          <div>
            <div className="settings-row-title">Pular permissões ao abrir sessão</div>
            <div className="settings-row-sub">Adiciona --dangerously-skip-permissions ao retomar sessões</div>
          </div>
        </label>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={theme === 'light'}
            onChange={(e) => onChangeTheme(e.target.checked ? 'light' : 'dark')}
          />
          <div>
            <div className="settings-row-title">Tema claro</div>
            <div className="settings-row-sub">Desmarcado usa o tema escuro padrão</div>
          </div>
        </label>
      </div>
    </div>
  );
}
