import { describe, it, expect } from 'vitest';
import {
  URLPolicyEngine,
  ProcessPolicyEngine,
  SessionStateMachine,
  generateEd25519KeyPair,
  signExamConfiguration,
  verifySignedConfiguration,
  type ExamConfiguration,
} from '@seb/core';

describe('Penetration-Style Security Bypass Self-Test Suite', () => {
  const secureConfig: ExamConfiguration = {
    configurationId: 'sec-test-uuid-999',
    configurationVersion: '1.0.0',
    examId: 'SECURITY-AUDIT-2026',
    examName: 'Cybersecurity Assessment Final',
    organization: 'Institute of Cyber Security',
    createdAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 7200 * 1000).toISOString(),
    minClientVersion: '1.0.0',
    startURL: 'https://secure.exam.edu/exam/session',
    allowedURLs: [
      { pattern: 'https://secure.exam.edu/exam/**', action: 'ALLOW', allowSubdomains: false, allowedMethods: ['GET', 'POST'] },
      { pattern: '*.assets.exam.edu', action: 'ALLOW', allowSubdomains: true, allowedMethods: ['GET'] },
    ],
    blockedURLs: [
      { pattern: 'https://secure.exam.edu/exam/admin/**', action: 'BLOCK', allowSubdomains: false, allowedMethods: [] },
      { pattern: 'https://secure.exam.edu/exam/debug/**', action: 'BLOCK', allowSubdomains: false, allowedMethods: [] },
    ],
    allowedProtocols: ['https'],
    blockedProtocols: ['http', 'file', 'javascript', 'vbscript', 'data', 'about', 'custom', 'mailto', 'cmd', 'powershell'],
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
      rules: [
        { name: 'discord.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: ['a3b4c5d6e7f809123456789abcdef0123456789abcdef0123456789abcdef012'], windowTitles: ['*Discord*'] },
        { name: 'obs64.exe', action: 'TERMINATE_EXAM', pathPatterns: [], sha256Hashes: [], windowTitles: ['*OBS*'] },
        { name: 'cheatengine-x86_64.exe', action: 'TERMINATE_EXAM', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Cheat Engine*'] },
      ],
    },
    securityProfile: 'BYOD',
    heartbeatIntervalSeconds: 10,
    networkFailurePolicy: { action: 'PAUSE', gracePeriodSeconds: 60 },
    quitPolicy: { requireExitPassword: true, exitPasswordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', allowQuitBeforeExamStart: true, allowQuitAfterSubmit: true },
  };

  const urlEngine = new URLPolicyEngine(secureConfig);
  const procEngine = new ProcessPolicyEngine(secureConfig);

  it('[PEN-01] Protocol Injection Attacks: file://, javascript:, data:, mailto:', () => {
    expect(urlEngine.evaluate('file:///C:/Windows/System32/drivers/etc/hosts').allowed).toBe(false);
    expect(urlEngine.evaluate('javascript:alert(document.cookie)').allowed).toBe(false);
    expect(urlEngine.evaluate('data:text/html,<h1>Cheatsheet</h1>').allowed).toBe(false);
    expect(urlEngine.evaluate('mailto:proctor@cheating.com').allowed).toBe(false);
    expect(urlEngine.evaluate('cmd://calc.exe').allowed).toBe(false);
    expect(urlEngine.evaluate('powershell://Invoke-Expression').allowed).toBe(false);
  });

  it('[PEN-02] HTTP Downgrade & Cleartext Navigation Attack', () => {
    const res = urlEngine.evaluate('http://secure.exam.edu/exam/session');
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('prohibited');
  });

  it('[PEN-03] Subdomain Spoofing & Phishing Domain Attack', () => {
    expect(urlEngine.evaluate('https://secure.exam.edu.attacker.com/exam').allowed).toBe(false);
    expect(urlEngine.evaluate('https://attacker-secure.exam.edu/exam').allowed).toBe(false);
  });

  it('[PEN-04] Restricted Admin/Debug Path Escape within Allowed Domain', () => {
    expect(urlEngine.evaluate('https://secure.exam.edu/exam/admin/console').allowed).toBe(false);
    expect(urlEngine.evaluate('https://secure.exam.edu/exam/debug/leak-answers').allowed).toBe(false);
  });

  it('[PEN-05] Renamed Binary Evasion via Window Title & SHA-256 Hash Matching', () => {
    const evasionAttempt1 = procEngine.evaluate({
      pid: 5050,
      name: 'notepad.exe',
      windowTitle: 'Friends - Discord',
    });
    expect(evasionAttempt1.action).toBe('BLOCK');

    const evasionAttempt2 = procEngine.evaluate({
      pid: 5051,
      name: 'calculator.exe',
      sha256Hash: 'a3b4c5d6e7f809123456789abcdef0123456789abcdef0123456789abcdef012',
    });
    expect(evasionAttempt2.action).toBe('BLOCK');
  });

  it('[PEN-06] Digital Signature Bit-Flip Tampering Attack', () => {
    const keys = generateEd25519KeyPair();
    const signed = signExamConfiguration(secureConfig, keys.privateKeyPem, keys.publicKeyPem, keys.keyId);

    const tampered = JSON.parse(JSON.stringify(signed));
    tampered.payload.startURL = 'https://google.com';

    const verifyResult = verifySignedConfiguration(tampered, keys.publicKeyPem);
    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.error).toContain('verification failed');
  });

  it('[PEN-07] Expired Configuration Replay Attack', () => {
    const keys = generateEd25519KeyPair();
    const expiredConfig: ExamConfiguration = {
      ...secureConfig,
      validUntil: new Date(Date.now() - 3600 * 1000).toISOString(),
    };
    const signedExpired = signExamConfiguration(expiredConfig, keys.privateKeyPem, keys.publicKeyPem, keys.keyId);

    const verifyResult = verifySignedConfiguration(signedExpired, keys.publicKeyPem);
    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.isExpired).toBe(true);
    expect(verifyResult.error).toContain('expired');
  });

  it('[PEN-08] State Machine Unauthorized Transition Attack', () => {
    const sm = new SessionStateMachine('UNINITIALIZED');
    expect(sm.transitionTo('EXAM_ACTIVE')).toBe(false);
    expect(sm.getState()).toBe('UNINITIALIZED');

    expect(sm.transitionTo('DIAGNOSTICS_IN_PROGRESS')).toBe(true);
    expect(sm.transitionTo('DIAGNOSTICS_FAILED')).toBe(true);
    expect(sm.transitionTo('STARTING_KIOSK')).toBe(false);
    expect(sm.getState()).toBe('DIAGNOSTICS_FAILED');
  });
});
