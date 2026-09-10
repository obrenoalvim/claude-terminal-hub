function updateStatusText(status, t) {
  switch (status.state) {
    case 'checking': return t('settings.updates.checking');
    case 'not-available': return t('settings.updates.upToDate');
    case 'available': return t('settings.updates.available', { version: status.version });
    case 'downloading': return t('settings.updates.downloading', { percent: Math.round(status.percent ?? 0) });
    case 'downloaded': return t('settings.updates.downloaded', { version: status.version });
    case 'error': return t('settings.updates.error', { message: status.message });
    case 'dev': return t('settings.updates.devMode');
    default: return '';
  }
}

export default function SettingsPanel({ skipPermissions, onChangeSkipPermissions, theme, onChangeTheme, lang, onChangeLang, defaultCwd, onChangeDefaultCwd, onClose, updateStatus, onCheckUpdates, onUpdateAll, t }) {
  const busy = updateStatus.state === 'checking' || updateStatus.state === 'downloading';
  const browseForDefaultCwd = async () => {
    const picked = await window.api.selectFolder(defaultCwd || undefined);
    if (picked) onChangeDefaultCwd(picked);
  };
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
        <div className="settings-row settings-updates">
          <div className="settings-row-title">{t('settings.defaultPath.title')}</div>
          <div className="settings-row-sub">{t('settings.defaultPath.sub')}</div>
          <input
            type="text"
            className="settings-path-input"
            value={defaultCwd}
            placeholder={t('settings.defaultPath.placeholder')}
            onChange={(e) => onChangeDefaultCwd(e.target.value)}
          />
          <div className="settings-updates-actions">
            <button type="button" onClick={browseForDefaultCwd}>{t('settings.defaultPath.browse')}</button>
            <button type="button" onClick={() => onChangeDefaultCwd('')}>{t('settings.defaultPath.reset')}</button>
          </div>
        </div>
        <div className="settings-row settings-updates">
          <div className="settings-row-title">{t('settings.updates.title')}</div>
          <div className="settings-updates-actions">
            <button type="button" disabled={busy} onClick={onCheckUpdates}>{t('settings.updates.check')}</button>
            <button type="button" disabled={busy} onClick={onUpdateAll}>{t('settings.updates.updateAll')}</button>
          </div>
          {updateStatus.state !== 'idle' && (
            <div className="settings-row-sub">{updateStatusText(updateStatus, t)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
