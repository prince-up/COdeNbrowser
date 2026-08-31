import {
  verifySignedConfiguration,
  type SignedExamConfigFile,
  type ExamConfiguration,
} from '@seb/core';
import { ExamServerDatabase } from '../store/in-memory-db.js';

export interface HandshakeRequest {
  clientVersion: string;
  signedConfig: SignedExamConfigFile;
  clientNonce: string;
}

export interface HandshakeResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
  serverTime: string;
  heartbeatIntervalSeconds: number;
}

export class AuthService {
  private db = ExamServerDatabase.instance;

  public processHandshake(req: HandshakeRequest, clientIp: string): HandshakeResponse {
    const serverTime = new Date().toISOString();

    // 1. Verify Signed Configuration Structure
    if (!req.signedConfig || !req.signedConfig.header) {
      return { success: false, error: 'Invalid or missing signed configuration container', serverTime, heartbeatIntervalSeconds: 10 };
    }

    const { configurationId, keyId } = req.signedConfig.header;

    // 2. Check Configuration Revocation List (CRL)
    if (this.db.isConfigRevoked(configurationId)) {
      return {
        success: false,
        error: `Examination configuration '${configurationId}' has been revoked by the administrator`,
        serverTime,
        heartbeatIntervalSeconds: 10,
      };
    }

    // 3. Check Trusted Public Key
    const trustedKey = this.db.trustedPublicKeys.get(keyId);
    const verification = verifySignedConfiguration(req.signedConfig, trustedKey);

    if (!verification.valid || !verification.config) {
      return {
        success: false,
        error: verification.error || 'Cryptographic verification failed for exam configuration',
        serverTime,
        heartbeatIntervalSeconds: 10,
      };
    }

    const config = verification.config;

    // 4. Verify Minimum Client Version requirement
    if (this.isVersionLessThan(req.clientVersion, config.minClientVersion)) {
      return {
        success: false,
        error: `Client version ${req.clientVersion} is outdated. Minimum required version is ${config.minClientVersion}.`,
        serverTime,
        heartbeatIntervalSeconds: 10,
      };
    }

    if (config.maxClientVersion && this.isVersionGreaterThan(req.clientVersion, config.maxClientVersion)) {
      return {
        success: false,
        error: `Client version ${req.clientVersion} exceeds maximum allowed version ${config.maxClientVersion}.`,
        serverTime,
        heartbeatIntervalSeconds: 10,
      };
    }

    // 5. Generate Session ID and Register Active Session
    const sessionId = crypto.randomUUID();
    this.db.activeSessions.set(sessionId, {
      sessionId,
      examId: config.examId,
      configurationId,
      clientVersion: req.clientVersion,
      startedAt: serverTime,
      lastHeartbeatAt: serverTime,
      status: 'READY_TO_START',
      riskScore: 0,
      ipAddress: clientIp,
      violationsCount: 0,
    });

    return {
      success: true,
      sessionId,
      serverTime,
      heartbeatIntervalSeconds: config.heartbeatIntervalSeconds || 10,
    };
  }

  private isVersionLessThan(v1: string, v2: string): boolean {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 < num2) return true;
      if (num1 > num2) return false;
    }
    return false;
  }

  private isVersionGreaterThan(v1: string, v2: string): boolean {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 > num2) return true;
      if (num1 < num2) return false;
    }
    return false;
  }
}
