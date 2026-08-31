import { contextBridge, ipcRenderer } from 'electron';
import type { SystemDiagnosticsReport, ExamConfiguration } from '@seb/core';

export interface SebBridgeAPI {
  runDiagnostics: () => Promise<SystemDiagnosticsReport>;
  loadConfigFile: (filePath?: string) => Promise<{ success: boolean; config?: ExamConfiguration; error?: string }>;
  startExamSession: (customUrl?: string) => Promise<{ success: boolean; error?: string }>;
  requestExit: () => Promise<void>;
  verifyExitPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  onSecurityEvent: (callback: (event: any) => void) => () => void;
  onDiagnosticsUpdate: (callback: (report: SystemDiagnosticsReport) => void) => () => void;
}

const api: SebBridgeAPI = {
  runDiagnostics: () => ipcRenderer.invoke('seb:run-diagnostics'),
  loadConfigFile: (filePath?: string) => ipcRenderer.invoke('seb:load-config', filePath),
  startExamSession: (customUrl?: string) => ipcRenderer.invoke('seb:start-exam', customUrl),
  requestExit: () => ipcRenderer.invoke('seb:request-exit'),
  verifyExitPassword: (password: string) => ipcRenderer.invoke('seb:verify-exit-password', password),
  onSecurityEvent: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('seb:security-event', handler);
    return () => ipcRenderer.removeListener('seb:security-event', handler);
  },
  onDiagnosticsUpdate: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('seb:diagnostics-update', handler);
    return () => ipcRenderer.removeListener('seb:diagnostics-update', handler);
  },
};

contextBridge.exposeInMainWorld('sebBridge', api);
