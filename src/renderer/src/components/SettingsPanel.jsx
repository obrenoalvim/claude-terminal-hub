export default function SettingsPanel({ skipPermissions, onChangeSkipPermissions, theme, onChangeTheme, lang, onChangeLang, onClose, t }) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <span>{t('settings.title')}</span>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={skipPermissions}
            onChange={(e) => onChangeSkipPermissions(e.target.checked)}
          />
          <div>
            <div className="settings-row-title">{t('settings.skipPermissions.title')}</div>
            <div className="settings-row-sub">{t('settings.skipPermissions.sub')}</div>
          </div>
        </label>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={theme === 'light'}
            onChange={(e) => onChangeTheme(e.target.checked ? 'light' : 'dark')}
          />
          <div>
            <div className="settings-row-title">{t('settings.theme.title')}</div>
            <div className="settings-row-sub">{t('settings.theme.sub')}</div>
          </div>
        </label>
        <label className="settings-row">
          <input
            type="checkbox"
            checked={lang === 'pt'}
            onChange={(e) => onChangeLang(e.target.checked ? 'pt' : 'en')}
          />
          <div>
            <div className="settings-row-title">{t('settings.language.title')}</div>
            <div className="settings-row-sub">{t('settings.language.sub')}</div>
          </div>
        </label>
      </div>
    </div>
  );
}
