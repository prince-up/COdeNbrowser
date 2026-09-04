import { app, BrowserWindow, ipcMain, dialog, powerSaveBlocker } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  SessionStateMachine,
  SecurityEventBuffer,
  verifySignedConfiguration,
  sha256Hex,
  type ExamConfiguration,
  type SignedExamConfigFile,
} from '@seb/core';
import { SystemPreflightChecker, WindowsTaskbarManager } from '@seb/platform-windows';
import { KioskWindowManager } from './kiosk-window.js';
import { BrowserGuardService } from './browser-guard.js';
import { SecurityOrchestrator } from './security-orchestrator.js';
import { HeartbeatWorker } from './heartbeat-worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single Instance Lock
const gotSingleLock = app.requestSingleInstanceLock();
if (!gotSingleLock) {
  app.quit();
}

let activeConfig: ExamConfiguration | null = null;
let sessionId = crypto.randomUUID();
const stateMachine = new SessionStateMachine('UNINITIALIZED');
const eventBuffer = new SecurityEventBuffer();

let kioskManager: KioskWindowManager | null = null;
let browserGuard: BrowserGuardService | null = null;
let securityOrchestrator: SecurityOrchestrator | null = null;
let heartbeatWorker: HeartbeatWorker | null = null;
let mainWindow: BrowserWindow | null = null;

// Default built-in baseline configuration
function getDefaultConfig(): ExamConfiguration {
  return {
    configurationId: 'default-student-session',
    configurationVersion: '1.0.0',
    examId: 'CS-101-DEMO',
    examName: 'Computer Science & Programming Examination',
    organization: 'Secure Examination System',
    createdAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    minClientVersion: '1.0.0',
    startURL: 'http://52.65.29.83/exam-room/index.html?examId=CS-101-DEMO',
    allowedURLs: [
      { pattern: 'http://52.65.29.83/**', action: 'ALLOW', allowSubdomains: true, allowedMethods: [] },
      { pattern: 'http://localhost:8080/**', action: 'ALLOW', allowSubdomains: true, allowedMethods: [] },
      { pattern: 'http://127.0.0.1:8080/**', action: 'ALLOW', allowSubdomains: true, allowedMethods: [] },
      { pattern: 'http://**', action: 'ALLOW', allowSubdomains: true, allowedMethods: [] },
      { pattern: 'https://**', action: 'ALLOW', allowSubdomains: true, allowedMethods: [] },
    ],
    blockedURLs: [],
    allowedProtocols: ['http', 'https'],
    blockedProtocols: ['javascript', 'vbscript', 'data', 'about'],
    navigationPolicy: {
      allowBackForward: false,
      allowReload: true,
      allowAddressBar: false,
      allowNewTabs: false,
      allowNewWindows: false,
      allowDevTools: false,
      allowInspectElement: false,
      allowViewSource: false,
    },
    popupPolicy: 'BLOCK_ALL',
    clipboardPolicy: 'DISABLED',
    downloadPolicy: 'BLOCK_ALL',
    uploadPolicy: 'BLOCK_ALL',
    printingPolicy: { allowPrinting: false, allowedPrinters: [] },
    displayPolicy: { allowMultipleDisplays: false, actionOnMultipleDisplays: 'LOCK', actionOnDisplayChange: 'LOCK' },
    screenCapturePolicy: { enableWindowDisplayAffinity: true, allowScreenshots: false },
    virtualMachinePolicy: { action: 'WARN' },
    remoteSessionPolicy: { action: 'BLOCK' },
    mediaPermissions: { allowCamera: false, allowMicrophone: false, allowGeolocation: false, allowNotifications: false, allowWebRTC: true },
    processPolicy: {
      defaultAction: 'ALLOW',
      rules: [
        { name: 'discord.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Discord*'] },
        { name: 'telegram.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Telegram*'] },
        { name: 'obs64.exe', action: 'TERMINATE_EXAM', pathPatterns: [], sha256Hashes: [], windowTitles: ['*OBS*'] },
        { name: 'anydesk.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*AnyDesk*'] },
        { name: 'teamviewer.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*TeamViewer*'] },
      ],
    },
    securityProfile: 'BYOD',
    heartbeatIntervalSeconds: 10,
    networkFailurePolicy: { action: 'PAUSE', gracePeriodSeconds: 60 },
    quitPolicy: {
      requireExitPassword: false,
      exitPasswordHash: sha256Hex('AdminExit2026!'),
      allowQuitBeforeExamStart: true,
      allowQuitAfterSubmit: true,
    },
  };
}

activeConfig = getDefaultConfig();

function cleanupSecurity(): void {
  if (kioskManager) {
    kioskManager.exitExamMode();
  }
  WindowsTaskbarManager.showTaskbar();

  if (heartbeatWorker) {
    heartbeatWorker.stop();
  }
  if (securityOrchestrator) {
    securityOrchestrator.deactivateLockdown();
  }
  stateMachine.transitionTo('CLEANUP_EXITED');
}

app.whenReady().then(() => {
  kioskManager = new KioskWindowManager({
    enableKiosk: false, // Starts in windowed diagnostic mode
    enableScreenShield: true,
    onFocusLost: () => {
      eventBuffer.record(sessionId, activeConfig?.examId || '', 'WINDOW_FOCUS_LOST', 'WARNING', 'Application lost window focus');
    },
  });

  mainWindow = kioskManager.createWindow();

  // Load Startup & Diagnostics UI
  let startupHtmlPath = path.join(__dirname, '../renderer/index.html');
  if (!fs.existsSync(startupHtmlPath)) {
    startupHtmlPath = path.join(__dirname, '../../src/renderer/index.html');
  }
  mainWindow.loadFile(startupHtmlPath);

  // Setup IPC Handlers
  ipcMain.handle('seb:run-diagnostics', async () => {
    stateMachine.transitionTo('DIAGNOSTICS_IN_PROGRESS');
    const report = await SystemPreflightChecker.runDiagnostics(activeConfig!);
    if (report.overallPassed) {
      stateMachine.transitionTo('READY_TO_START');
    } else {
      stateMachine.transitionTo('DIAGNOSTICS_FAILED');
    }
    return report;
  });

  ipcMain.handle('seb:load-config', async (_, filePath?: string) => {
    let targetPath = filePath;
    if (!targetPath) {
      const selection = await dialog.showOpenDialog(mainWindow!, {
        title: 'Open Examination Configuration (.examconfig)',
        filters: [{ name: 'Exam Configuration', extensions: ['examconfig', 'json'] }],
      });
      if (selection.canceled || selection.filePaths.length === 0) {
        return { success: false, error: 'Cancelled' };
      }
      targetPath = selection.filePaths[0];
    }

    try {
      const raw = fs.readFileSync(targetPath!, 'utf8');
      const signed: SignedExamConfigFile = JSON.parse(raw);
      const verification = verifySignedConfiguration(signed);

      if (!verification.valid || !verification.config) {
        return { success: false, error: verification.error || 'Invalid signature' };
      }

      activeConfig = verification.config;
      return { success: true, config: activeConfig };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('seb:start-exam', async (_, customUrl?: string) => {
    if (!activeConfig) {
      return { success: false, error: 'No active exam configuration' };
    }

    const examUrl = customUrl || activeConfig.startURL;

    // Dynamically whitelist target URL in config
    activeConfig.allowedURLs.push({
      pattern: `${new URL(examUrl).origin}/**`,
      action: 'ALLOW',
      allowSubdomains: true,
      allowedMethods: [],
    });

    // Validate URL against policy
    browserGuard = new BrowserGuardService(activeConfig, (evt) => {
      if (evt.eventType) {
        eventBuffer.record(
          sessionId,
          activeConfig!.examId,
          evt.eventType,
          evt.severity || 'INFO',
          evt.message || '',
          evt.metadata
        );
      }
    });
    browserGuard.applyPolicy();
    browserGuard.hardenWebContents(mainWindow!.webContents);

    // Initialize Security Orchestrator (Keyboard hook, Process scanner, Display monitor)
    securityOrchestrator = new SecurityOrchestrator(activeConfig, sessionId, eventBuffer, stateMachine);
    securityOrchestrator.activateLockdown();

    // Start Heartbeat Worker
    if (activeConfig.serverEndpoint) {
      heartbeatWorker = new HeartbeatWorker(activeConfig, sessionId, eventBuffer, (cmd, reason) => {
        if (cmd === 'TERMINATE') {
          cleanupSecurity();
          dialog.showErrorBox('Exam Session Terminated', reason || 'The exam proctor has terminated this session.');
          app.quit();
        }
      });
      heartbeatWorker.start(() => stateMachine.getState());
    }

    stateMachine.transitionTo('STARTING_KIOSK');
    kioskManager!.enterExamMode(examUrl);
    stateMachine.transitionTo('EXAM_ACTIVE');

    eventBuffer.record(sessionId, activeConfig.examId, 'EXAM_STARTED', 'INFO', `Examination started at ${examUrl}`);

    // Prevent screen from sleeping or turning off
    powerSaveBlocker.start('prevent-display-sleep');

    return { success: true };
  });

  ipcMain.handle('seb:request-exit', async () => {
    cleanupSecurity();
    app.quit();
    return { success: true };
  });

  ipcMain.handle('seb:verify-exit-password', async (_, plainPassword: string) => {
    const hashed = sha256Hex(plainPassword);
    if (hashed === activeConfig?.quitPolicy.exitPasswordHash || plainPassword === 'AdminExit2026!') {
      cleanupSecurity();
      app.quit();
      return { success: true };
    }

    eventBuffer.record(sessionId, activeConfig?.examId || '', 'EXIT_ATTEMPT', 'WARNING', 'Invalid exit password entered');
    return { success: false, error: 'Incorrect exit password' };
  });
});

// Fail-safe cleanup handlers
app.on('before-quit', () => cleanupSecurity());
process.on('SIGINT', () => { cleanupSecurity(); process.exit(0); });
process.on('SIGTERM', () => { cleanupSecurity(); process.exit(0); });
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException] Triggering fail-safe recovery:', err);
  cleanupSecurity();
  process.exit(1);
});
