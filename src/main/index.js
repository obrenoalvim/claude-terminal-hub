import { join } from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { listSessions } from './sessions.js';
import { startPty, writeToPty, resizePty, killPty, killAllPtys } from './pty-manager.js';

const isDev = !app.isPackaged;
const iconPath = join(__dirname, '../../build/icon.ico');

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

  ipcMain.on('pty:start', (event, { paneId, cwd, cols, rows, command }) => {
    startPty(
      paneId,
      { cwd, cols, rows, command },
      (data) => win.webContents.send(`pty:data:${paneId}`, data),
      () => win.webContents.send(`pty:exit:${paneId}`)
    );
  });
  ipcMain.on('pty:input', (event, { paneId, data }) => writeToPty(paneId, data));
  ipcMain.on('pty:resize', (event, { paneId, cols, rows }) => resizePty(paneId, cols, rows));
  ipcMain.on('pty:kill', (event, { paneId }) => killPty(paneId));

  win.on('closed', killAllPtys);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  killAllPtys();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
