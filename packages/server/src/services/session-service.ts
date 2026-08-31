import type {
  ClientHeartbeatPayload,
  ServerHeartbeatResponse,
  SecurityEvent,
} from '@seb/core';
import { ExamServerDatabase } from '../store/in-memory-db.js';

export class SessionService {
  private db = ExamServerDatabase.instance;

  public processHeartbeat(payload: ClientHeartbeatPayload): ServerHeartbeatResponse {
    const serverTime = new Date().toISOString();
    const session = this.db.activeSessions.get(payload.sessionId);

    if (!session) {
      return {
        receivedAt: serverTime,
        serverTime,
        command: 'TERMINATE',
        commandReason: 'Session does not exist or was expired on server',
        isConfigRevoked: false,
      };
    }

    const isRevoked = this.db.isConfigRevoked(session.configurationId);
    if (isRevoked) {
      session.status = 'EXAM_TERMINATED';
      return {
        receivedAt: serverTime,
        serverTime,
        command: 'TERMINATE',
        commandReason: 'Active exam configuration has been revoked by proctor',
        isConfigRevoked: true,
      };
    }

    // Update Session State & Risk Score
    session.lastHeartbeatAt = serverTime;
    session.status = payload.sessionState;
    session.riskScore = payload.riskScore;
    session.violationsCount = payload.activeViolationsCount;

    // Append to Heartbeat History
    const history = this.db.heartbeatHistory.get(payload.sessionId) || [];
    history.push(payload);
    if (history.length > 120) history.shift(); // retain last 20 minutes
    this.db.heartbeatHistory.set(payload.sessionId, history);

    // Return any forced command set by admin
    const forcedCommand = session.forcedCommand || 'NOOP';
    const forcedReason = session.forcedCommandReason;
    if (session.forcedCommand) {
      session.forcedCommand = undefined; // consume command
    }

    return {
      receivedAt: serverTime,
      serverTime,
      command: forcedCommand,
      commandReason: forcedReason,
      isConfigRevoked: false,
    };
  }

  public recordSecurityEvents(events: SecurityEvent[]): void {
    for (const evt of events) {
      this.db.recordEvent(evt);
      const session = this.db.activeSessions.get(evt.sessionId);
      if (session) {
        session.violationsCount++;
        // Escalate risk score based on severity
        if (evt.severity === 'FATAL') session.riskScore = Math.min(100, session.riskScore + 50);
        else if (evt.severity === 'CRITICAL') session.riskScore = Math.min(100, session.riskScore + 25);
        else if (evt.severity === 'WARNING') session.riskScore = Math.min(100, session.riskScore + 10);
      }
    }
  }

  public terminateSession(sessionId: string, reason: string): boolean {
    const session = this.db.activeSessions.get(sessionId);
    if (!session) return false;

    session.forcedCommand = 'TERMINATE';
    session.forcedCommandReason = reason;
    session.status = 'EXAM_TERMINATED';
    return true;
  }
}
