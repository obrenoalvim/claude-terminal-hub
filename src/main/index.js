import { join } from 'node:path';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log/main';
import { listSessions, deleteSession, renameSession, pinSession } from './sessions.js';
import { startPty, writeToPty, resizePty, killPty, killAllPtys } from './pty-manager.js';
import { translate, DEFAULT_LANG } from '../shared/i18n.js';

log.errorHandler.startCatching();

const isDev = !app.isPackaged;
const iconPath = join(__dirname, '../../build/icon.ico');
let currentLang = DEFAULT_LANG;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: '#0b0c10',
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  ipcMain.handle('sessions:list', () => listSessions());
  ipcMain.handle('sessions:delete', (event, id) => deleteSession(id));
  ipcMain.handle('sessions:rename', (event, id, name) => renameSession(id, name));
  ipcMain.handle('sessions:pin', (event, id, pinned) => pinSession(id, pinned));
  ipcMain.on('renderer:error', (event, message) => log.error('[renderer]', message));
  ipcMain.on('settings:language', (event, lang) => { currentLang = lang; });

  ipcMain.on('pty:start', (event, { paneId, cwd, cols, rows, command, shell }) => {
    startPty(
      paneId,
      { cwd, cols, rows, command, shell },
      (data) => { if (!win.isDestroyed()) win.webContents.send(`pty:data:${paneId}`, data); },
      () => { if (!win.isDestroyed()) win.webContents.send(`pty:exit:${paneId}`); }
    );
  });
  ipcMain.on('pty:input', (event, { paneId, data }) => writeToPty(paneId, data));
  ipcMain.on('pty:resize', (event, { paneId, cols, rows }) => resizePty(paneId, cols, rows));
  ipcMain.on('pty:kill', (event, { paneId }) => killPty(paneId));

  win.on('close', killAllPtys);
}

autoUpdater.autoDownload = false;

autoUpdater.on('update-available', (info) => {
  dialog
    .showMessageBox({
      type: 'info',
      title: translate(currentLang, 'update.available.title'),
      message: translate(currentLang, 'update.available.message', { version: info.version }),
      buttons: [translate(currentLang, 'update.available.now'), translate(currentLang, 'update.available.later')],
      defaultId: 0,
      cancelId: 1,
    })
    .then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate();
    });
});

autoUpdater.on('update-downloaded', (info) => {
  dialog
    .showMessageBox({
      type: 'info',
      title: translate(currentLang, 'update.downloaded.title'),
      message: translate(currentLang, 'update.downloaded.message', { version: info.version }),
      buttons: [translate(currentLang, 'update.downloaded.now'), translate(currentLang, 'update.downloaded.later')],
      defaultId: 0,
      cancelId: 1,
    })
    .then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
});

app.whenReady().then(() => {
  log.info(`Claude Terminal Hub ${app.getVersion()} starting`);
  createWindow();
  if (app.isPackaged) autoUpdater.checkForUpdates();
});

app.on('window-all-closed', () => {
  killAllPtys();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
