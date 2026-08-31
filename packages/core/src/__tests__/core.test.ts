import { describe, it, expect } from 'vitest';
import {
  generateEd25519KeyPair,
  signExamConfiguration,
  verifySignedConfiguration,
  encryptAndSignExamConfiguration,
  decryptExamConfiguration,
  canonicalizeJson,
  URLPolicyEngine,
  ProcessPolicyEngine,
  SessionStateMachine,
  ExamConfiguration,
} from '../index.js';

describe('@seb/core Crypto & Policy Suites', () => {
  const sampleConfig: ExamConfiguration = {
    configurationId: '12345678-1234-1234-1234-123456789abc',
    configurationVersion: '1.0.0',
    examId: 'CS-401-FINAL',
    examName: 'Advanced Distributed Systems Final Exam',
    organization: 'State University Department of Computer Science',
    createdAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 3600 * 1000).toISOString(),
    minClientVersion: '1.0.0',
    startURL: 'https://exam.university.edu/course/401/exam',
    allowedURLs: [
      { pattern: 'https://exam.university.edu/**', action: 'ALLOW', allowSubdomains: false, allowedMethods: ['GET', 'POST'] },
      { pattern: '*.cdn.university.edu', action: 'ALLOW', allowSubdomains: true, allowedMethods: ['GET'] },
    ],
    blockedURLs: [
      { pattern: 'https://exam.university.edu/admin/**', action: 'BLOCK', allowSubdomains: false, allowedMethods: [] },
    ],
    allowedProtocols: ['https'],
    blockedProtocols: ['http', 'file', 'javascript', 'vbscript', 'data', 'about'],
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
    printingPolicy: {
      allowPrinting: false,
      allowedPrinters: [],
    },
    displayPolicy: {
      allowMultipleDisplays: false,
      actionOnMultipleDisplays: 'LOCK',
      actionOnDisplayChange: 'LOCK',
    },
    screenCapturePolicy: {
      enableWindowDisplayAffinity: true,
      allowScreenshots: false,
    },
    virtualMachinePolicy: {
      action: 'BLOCK',
    },
    remoteSessionPolicy: {
      action: 'BLOCK',
    },
    mediaPermissions: {
      allowCamera: false,
      allowMicrophone: false,
      allowGeolocation: false,
      allowNotifications: false,
      allowWebRTC: true,
    },
    processPolicy: {
      defaultAction: 'ALLOW',
      rules: [
        { name: 'discord.exe', action: 'BLOCK', pathPatterns: [], sha256Hashes: [], windowTitles: ['*Discord*'] },
        { name: 'obs64.exe', action: 'TERMINATE_EXAM', pathPatterns: [], sha256Hashes: [], windowTitles: [] },
      ],
    },
    securityProfile: 'BYOD',
    heartbeatIntervalSeconds: 10,
    networkFailurePolicy: {
      action: 'PAUSE',
      gracePeriodSeconds: 60,
    },
    quitPolicy: {
      requireExitPassword: true,
      exitPasswordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      allowQuitBeforeExamStart: true,
      allowQuitAfterSubmit: true,
    },
  };

  it('correctly canonicalizes JSON deterministically', () => {
    const objA = { b: 2, a: 1, nested: { y: 20, x: 10 } };
    const objB = { nested: { x: 10, y: 20 }, a: 1, b: 2 };
    expect(canonicalizeJson(objA)).toBe(canonicalizeJson(objB));
    expect(canonicalizeJson(objA)).toBe('{"a":1,"b":2,"nested":{"x":10,"y":20}}');
  });

  it('generates Ed25519 keys, signs and verifies config integrity', () => {
    const keyPair = generateEd25519KeyPair();
    const signed = signExamConfiguration(sampleConfig, keyPair.privateKeyPem, keyPair.publicKeyPem, keyPair.keyId);

    const verification = verifySignedConfiguration(signed, keyPair.publicKeyPem);
    expect(verification.valid).toBe(true);
    expect(verification.config?.examId).toBe('CS-401-FINAL');

    // Tampering test: modify examId
    const tampered = JSON.parse(JSON.stringify(signed));
    (tampered.payload as ExamConfiguration).examId = 'MALICIOUS_TAMPER';
    const tamperedResult = verifySignedConfiguration(tampered, keyPair.publicKeyPem);
    expect(tamperedResult.valid).toBe(false);
  });

  it('encrypts and decrypts configuration with password using AES-256-GCM', () => {
    const keyPair = generateEd25519KeyPair();
    const password = 'SuperSecretUniversityExamPassword123!';

    const encrypted = encryptAndSignExamConfiguration(sampleConfig, {
      password,
      privateKeyPem: keyPair.privateKeyPem,
      publicKeyPem: keyPair.publicKeyPem,
      keyId: keyPair.keyId,
    });

    expect(encrypted.format).toBe('SEB_CONFIG_ENCRYPTED_V1');
    expect(typeof encrypted.payload).toBe('string');

    const decrypted = decryptExamConfiguration(encrypted, password);
    expect(decrypted.examId).toBe('CS-401-FINAL');
    expect(decrypted.organization).toBe('State University Department of Computer Science');

    // Wrong password test
    expect(() => decryptExamConfiguration(encrypted, 'WrongPassword')).toThrow();
  });

  it('evaluates URL policies with exact whitelists, wildcards, and blacklists', () => {
    const engine = new URLPolicyEngine(sampleConfig);

    // Allowed start URL
    const res1 = engine.evaluate('https://exam.university.edu/course/401/exam/question/1');
    expect(res1.allowed).toBe(true);

    // Allowed CDN subdomain
    const res2 = engine.evaluate('https://static.cdn.university.edu/assets/styles.css');
    expect(res2.allowed).toBe(true);

    // Blocked path on allowed domain
    const res3 = engine.evaluate('https://exam.university.edu/admin/settings');
    expect(res3.allowed).toBe(false);

    // Blocked protocol (http or file)
    const res4 = engine.evaluate('http://exam.university.edu/course/401/exam');
    expect(res4.allowed).toBe(false);
    expect(res4.reason).toContain('prohibited');

    const res5 = engine.evaluate('file:///C:/Users/student/cheatsheet.pdf');
    expect(res5.allowed).toBe(false);

    // Unauthorized external site
    const res6 = engine.evaluate('https://google.com/search?q=cheating');
    expect(res6.allowed).toBe(false);
  });

  it('evaluates Process policies for prohibited applications and window titles', () => {
    const engine = new ProcessPolicyEngine(sampleConfig);

    // Discord block
    const proc1 = engine.evaluate({ pid: 1001, name: 'discord.exe' });
    expect(proc1.action).toBe('BLOCK');

    // OBS terminate
    const proc2 = engine.evaluate({ pid: 1002, name: 'obs64.exe' });
    expect(proc2.action).toBe('TERMINATE_EXAM');

    // Window title match
    const proc3 = engine.evaluate({ pid: 1003, name: 'random_named_app.exe', windowTitle: 'Welcome to Discord Server' });
    expect(proc3.action).toBe('BLOCK');

    // Allowed default app (e.g. calculator or explorer)
    const proc4 = engine.evaluate({ pid: 1004, name: 'notepad.exe' });
    expect(proc4.action).toBe('ALLOW');
  });

  it('enforces valid transitions in SessionStateMachine', () => {
    const sm = new SessionStateMachine();
    expect(sm.getState()).toBe('UNINITIALIZED');

    expect(sm.transitionTo('DIAGNOSTICS_IN_PROGRESS')).toBe(true);
    expect(sm.transitionTo('READY_TO_START')).toBe(true);
    expect(sm.transitionTo('STARTING_KIOSK')).toBe(true);
    expect(sm.transitionTo('EXAM_ACTIVE')).toBe(true);

    // Invalid transition
    expect(sm.transitionTo('UNINITIALIZED')).toBe(false);
    expect(sm.getState()).toBe('EXAM_ACTIVE');

    expect(sm.transitionTo('SESSION_PAUSED', 'Secondary display connected')).toBe(true);
    expect(sm.getState()).toBe('SESSION_PAUSED');

    expect(sm.transitionTo('EXAM_ACTIVE', 'Secondary display removed')).toBe(true);
    expect(sm.transitionTo('EXAM_COMPLETED')).toBe(true);
    expect(sm.transitionTo('CLEANUP_EXITED')).toBe(true);
  });
});
