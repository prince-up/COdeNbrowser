import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../server.js';
import {
  generateEd25519KeyPair,
  signExamConfiguration,
  type ExamConfiguration,
} from '@seb/core';

describe('@seb/server Integration Tests', () => {
  const app = buildServer();
  const keyPair = generateEd25519KeyPair();

  const validConfig: ExamConfiguration = {
    configurationId: '87654321-4321-4321-4321-abcdefabcdef',
    configurationVersion: '1.0.0',
    examId: 'PHYS-202',
    examName: 'Quantum Mechanics Midterm',
    organization: 'Department of Physics',
    createdAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 3600 * 1000).toISOString(),
    minClientVersion: '1.0.0',
    startURL: 'https://exam.physics.edu/exam/202',
    allowedURLs: [{ pattern: 'https://exam.physics.edu/**', action: 'ALLOW', allowSubdomains: false, allowedMethods: [] }],
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
    processPolicy: { defaultAction: 'ALLOW', rules: [] },
    securityProfile: 'BYOD',
    heartbeatIntervalSeconds: 10,
    networkFailurePolicy: { action: 'PAUSE', gracePeriodSeconds: 60 },
    quitPolicy: { requireExitPassword: false, allowQuitBeforeExamStart: true, allowQuitAfterSubmit: true },
  };

  const signedConfig = signExamConfiguration(
    validConfig,
    keyPair.privateKeyPem,
    keyPair.publicKeyPem,
    keyPair.keyId
  );

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds to health check', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });
    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.status).toBe('HEALTHY');
  });

  it('registers new exam configuration via admin API', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/configs',
      payload: {
        config: signedConfig,
        trustedPublicKeyPem: keyPair.publicKeyPem,
      },
    });
    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.configurationId).toBe(validConfig.configurationId);
  });

  it('performs client handshake successfully for valid config', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/session/handshake',
      payload: {
        clientVersion: '1.0.0',
        signedConfig,
        clientNonce: 'random_nonce_123',
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.sessionId).toBeDefined();

    // Now send heartbeat
    const hbRes = await app.inject({
      method: 'POST',
      url: '/api/v1/session/heartbeat',
      payload: {
        sessionId: json.sessionId,
        examId: validConfig.examId,
        clientVersion: '1.0.0',
        configVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        uptimeSeconds: 10,
        sessionState: 'EXAM_ACTIVE',
        riskScore: 0,
        activeViolationsCount: 0,
        systemMetrics: {
          displayCount: 1,
          hasVirtualMachine: false,
          hasRemoteSession: false,
        },
      },
    });

    expect(hbRes.statusCode).toBe(200);
    const hbJson = JSON.parse(hbRes.body);
    expect(hbJson.command).toBe('NOOP');
  });

  it('rejects handshake for outdated client version', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/session/handshake',
      payload: {
        clientVersion: '0.9.0', // below minClientVersion 1.0.0
        signedConfig,
        clientNonce: 'random_nonce_123',
      },
    });

    expect(res.statusCode).toBe(403);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(false);
    expect(json.error).toContain('outdated');
  });

  it('revokes configuration and terminates active session on next heartbeat', async () => {
    // 1. Revoke config
    const revokeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/revoke',
      payload: { configurationId: validConfig.configurationId },
    });
    expect(revokeRes.statusCode).toBe(200);

    // 2. Attempt new handshake with revoked config -> rejected
    const handshakeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/session/handshake',
      payload: {
        clientVersion: '1.0.0',
        signedConfig,
        clientNonce: 'random_nonce_456',
      },
    });
    expect(handshakeRes.statusCode).toBe(403);
    const json = JSON.parse(handshakeRes.body);
    expect(json.error).toContain('revoked');
  });
});
