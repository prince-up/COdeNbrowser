const { contextBridge, ipcRenderer } = require('electron');

const api = {
  runDiagnostics: () => ipcRenderer.invoke('seb:run-diagnostics'),
  loadConfigFile: (filePath) => ipcRenderer.invoke('seb:load-config', filePath),
  startExamSession: (customUrl) => ipcRenderer.invoke('seb:start-exam', customUrl),
  requestExit: () => ipcRenderer.invoke('seb:request-exit'),
  verifyExitPassword: (password) => ipcRenderer.invoke('seb:verify-exit-password', password),
  onSecurityEvent: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('seb:security-event', handler);
    return () => ipcRenderer.removeListener('seb:security-event', handler);
  },
  onDiagnosticsUpdate: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('seb:diagnostics-update', handler);
    return () => ipcRenderer.removeListener('seb:diagnostics-update', handler);
  },
};

contextBridge.exposeInMainWorld('sebBridge', api);
