import { describe, it, expect } from 'vitest';
import {
  WindowsKeyboardHook,
  DisplayTopologyMonitor,
  VirtualMachineDetector,
  RemoteSessionDetector,
  SystemPreflightChecker,
} from '../index.js';
import type { ExamConfiguration } from '@seb/core';

describe('@seb/platform-windows Unit Tests', () => {
  const dummyConfig: ExamConfiguration = {
    configurationId: '12345678-1234-1234-1234-123456789abc',
    configurationVersion: '1.0.0',
    examId: 'MATH-101',
    examName: 'Calculus I Midterm',
    organization: 'Faculty of Sciences',
    createdAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 3600 * 1000).toISOString(),
    minClientVersion: '1.0.0',
    startURL: 'https://exam.university.edu/math101',
    allowedURLs: [{ pattern: 'https://exam.university.edu/**', action: 'ALLOW', allowSubdomains: false, allowedMethods: [] }],
    blockedURLs: [],
    allowedProtocols: ['https'],
    blockedProtocols: ['http', 'file'],
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
    virtualMachinePolicy: { action: 'BLOCK' },
    remoteSessionPolicy: { action: 'BLOCK' },
    mediaPermissions: { allowCamera: false, allowMicrophone: false, allowGeolocation: false, allowNotifications: false, allowWebRTC: false },
    processPolicy: {
      defaultAction: 'ALLOW',
      rules: [{ name: 'prohibited_test_app_9999.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: [] }],
    },
    securityProfile: 'BYOD',
    heartbeatIntervalSeconds: 10,
    networkFailurePolicy: { action: 'PAUSE', gracePeriodSeconds: 60 },
    quitPolicy: { requireExitPassword: false, allowQuitBeforeExamStart: true, allowQuitAfterSubmit: true },
  };

  it('initializes and manages KeyboardHook lifecycle safely', () => {
    let blockedKeyName = '';
    const hook = new WindowsKeyboardHook((name) => {
      blockedKeyName = name;
    });

    expect(hook.install()).toBe(true);
    const stats = hook.getStats();
    expect(stats.isActive).toBe(true);
    expect(hook.uninstall()).toBe(true);
    expect(hook.getStats().isActive).toBe(false);
  });

  it('detects display monitor count', () => {
    const monitor = new DisplayTopologyMonitor();
    const count = monitor.getDisplayCount();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('runs VM detection and returns structured result', () => {
    const vm = VirtualMachineDetector.detect();
    expect(vm).toBeDefined();
    expect(typeof vm.isVM).toBe('boolean');
    expect(['PHYSICAL', 'LIKELY_VM', 'UNKNOWN']).toContain(vm.confidence);
  });

  it('runs RDP detection and returns structured result', () => {
    const rdp = RemoteSessionDetector.detect();
    expect(rdp).toBeDefined();
    expect(typeof rdp.isRemoteSession).toBe('boolean');
  });

  it('executes pre-flight system diagnostics without crashing', async () => {
    const report = await SystemPreflightChecker.runDiagnostics(dummyConfig);
    expect(report).toBeDefined();
    expect(report.items.length).toBeGreaterThanOrEqual(4);
    expect(report.timestamp).toBeDefined();
  });
});
