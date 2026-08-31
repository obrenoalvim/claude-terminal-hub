import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  deleteSession: (id) => ipcRenderer.invoke('sessions:delete', id),
  renameSession: (id, name) => ipcRenderer.invoke('sessions:rename', id, name),
  pinSession: (id, pinned) => ipcRenderer.invoke('sessions:pin', id, pinned),
  logError: (message) => ipcRenderer.send('renderer:error', message),
  setLanguage: (lang) => ipcRenderer.send('settings:language', lang),

  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  updateAll: () => ipcRenderer.invoke('update:runAll'),
  onUpdateStatus: (callback) => {
    const listener = (event, status) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },

  startPty: (paneId, opts) => ipcRenderer.send('pty:start', { paneId, ...opts }),
  sendInput: (paneId, data) => ipcRenderer.send('pty:input', { paneId, data }),
  resizePty: (paneId, cols, rows) => ipcRenderer.send('pty:resize', { paneId, cols, rows }),
  killPty: (paneId) => ipcRenderer.send('pty:kill', { paneId }),

  onPtyData: (paneId, callback) => {
    const channel = `pty:data:${paneId}`;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onPtyExit: (paneId, callback) => {
    const channel = `pty:exit:${paneId}`;
    const listener = () => callback();
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
